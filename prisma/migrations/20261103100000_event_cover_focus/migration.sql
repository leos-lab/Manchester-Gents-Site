-- Where an event cover is cropped around ({ x, y } percentages).
ALTER TABLE "Event" ADD COLUMN "coverFocus" JSONB;
