-- Gallery photos admins featured for an event (Pinstripe ids, in order).
ALTER TABLE "Event" ADD COLUMN "featuredPhotoIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
