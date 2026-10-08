-- Section 7.1: Partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS one_open_shift_per_station
  ON "CashShift" ("posStationId") WHERE status = 'OPEN';

CREATE UNIQUE INDEX IF NOT EXISTS one_live_invoice_per_sale
  ON "Invoice" ("saleId") WHERE status IN ('PENDING_SYNC', 'ISSUED');

-- Section 7.2: Check constraints
ALTER TABLE "Product"       ADD CONSTRAINT product_units_positive   CHECK ("unitsPerPack" >= 1);
ALTER TABLE "StockMovement" ADD CONSTRAINT movement_qty_nonzero     CHECK (quantity <> 0);
ALTER TABLE "SaleItem"      ADD CONSTRAINT sale_item_qty_positive   CHECK (quantity > 0 AND "baseQuantity" > 0);
ALTER TABLE "Sale"          ADD CONSTRAINT sale_total_consistent    CHECK (total = subtotal - discount);
ALTER TABLE "SiatCafc"      ADD CONSTRAINT cafc_range_valid         CHECK ("rangeFrom" <= "rangeTo"
                                                                     AND "nextNumber" BETWEEN "rangeFrom" AND "rangeTo" + 1);