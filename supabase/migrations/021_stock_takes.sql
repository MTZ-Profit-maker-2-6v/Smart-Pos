-- 021_stock_takes.sql
-- Create stock_takes tables and RPCs for transactional stock take creation and application.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stock take parent
CREATE TABLE IF NOT EXISTS public.stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid,
  take_no text,
  date date,
  created_by uuid,
  status text DEFAULT 'pending',
  notes text,
  total_variance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stock take lines
CREATE TABLE IF NOT EXISTS public.stock_take_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id uuid NOT NULL REFERENCES public.stock_takes(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  system_qty numeric DEFAULT 0,
  counted_qty numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_value numeric DEFAULT 0
);

-- Helper sequence for readable take_no
CREATE SEQUENCE IF NOT EXISTS public.stock_take_no_seq;

-- RPC: create stock take with items transactionally
CREATE OR REPLACE FUNCTION public.stock_take_create(
  p_brand_id uuid,
  p_date date,
  p_created_by uuid,
  p_notes text,
  p_items jsonb
)
RETURNS TABLE (stock_take_id uuid, take_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_no text;
  v_items jsonb := COALESCE(p_items, '[]'::jsonb);
BEGIN
  v_id := gen_random_uuid();
  v_no := ('ST-' || nextval('public.stock_take_no_seq'));

  INSERT INTO public.stock_takes (id, brand_id, take_no, date, created_by, notes, updated_at)
  VALUES (v_id, p_brand_id, v_no, p_date, p_created_by, p_notes, now());

  IF jsonb_array_length(v_items) > 0 THEN
    INSERT INTO public.stock_take_items (stock_take_id, stock_item_id, system_qty, counted_qty, variance, unit_cost, total_value)
    SELECT
      v_id,
      (elem->>'stockItemId')::uuid,
      COALESCE((elem->>'systemQty')::numeric, 0),
      COALESCE((elem->>'countedQty')::numeric, 0),
      COALESCE((elem->>'countedQty')::numeric,0) - COALESCE((elem->>'systemQty')::numeric,0),
      COALESCE((elem->>'unitCost')::numeric, 0),
      COALESCE((elem->>'totalValue')::numeric, ((elem->>'countedQty')::numeric * (elem->>'unitCost')::numeric))
    FROM jsonb_array_elements(v_items) AS arr(elem);
  END IF;

  RETURN QUERY SELECT v_id, v_no;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stock_take_create(uuid, date, uuid, text, jsonb) TO authenticated;

-- RPC: apply a stock take (adjust stock_items and ledger) idempotently
CREATE OR REPLACE FUNCTION public.stock_take_apply(p_stock_take_id uuid)
RETURNS TABLE (stock_take_id uuid, status text, applied_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_st public.stock_takes%ROWTYPE;
  rec record;
BEGIN
  SELECT * INTO v_st FROM public.stock_takes WHERE id = p_stock_take_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock take not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_st.status <> 'pending' THEN
    stock_take_id := v_st.id;
    status := v_st.status;
    applied_at := v_st.updated_at;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Allow stock mutations inside this RPC
  PERFORM set_config('pmx.allow_stock_mutation', '1', true);

  FOR rec IN SELECT * FROM public.stock_take_items WHERE stock_take_id = v_st.id
  LOOP
    -- Apply variance to stock_items
    UPDATE public.stock_items s
    SET current_stock = s.current_stock + rec.variance,
        updated_at = now()
    WHERE s.id = rec.stock_item_id;

    -- Insert stock ledger entry for audit
    INSERT INTO public.stock_ledger(id, stock_item_id, change_amount, entry_type, reason, created_at)
    VALUES (gen_random_uuid(), rec.stock_item_id, rec.variance, 'STOCK_TAKE', ('Stock take ' || v_st.take_no), now());
  END LOOP;

  UPDATE public.stock_takes SET status = 'applied', updated_at = now() WHERE id = v_st.id;

  stock_take_id := v_st.id;
  status := 'applied';
  applied_at := now();
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stock_take_apply(uuid) TO authenticated;

COMMIT;
