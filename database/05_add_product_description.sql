USE cafe_management;

ALTER TABLE products ADD COLUMN description VARCHAR(200) NULL AFTER name;

UPDATE products SET description = CASE sku
  WHEN 'BEV-CARMAC' THEN 'Espresso with vanilla milk and caramel drizzle'
  WHEN 'BEV-CAPPU' THEN 'Espresso with foamed milk'
  WHEN 'BEV-ESPR' THEN 'Double shot of rich espresso'
  WHEN 'BEV-ICELAT' THEN 'Espresso with cold milk over ice'
  WHEN 'BEV-MATLAT' THEN 'Smooth matcha with steamed milk'
  WHEN 'BEV-CHOFRA' THEN 'Blended chocolate with whipped cream'
  WHEN 'FOD-CHISAN' THEN 'Grilled chicken sandwich with fresh greens'
  WHEN 'FOD-BEEBUR' THEN 'Beef patty with cheese and house sauce'
  WHEN 'PAS-CHOCRO' THEN 'Buttery croissant with chocolate filling'
  WHEN 'PAS-BLUMUF' THEN 'Soft muffin with blueberry compote'
  ELSE description
END;
