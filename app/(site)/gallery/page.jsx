import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Gallery",
  description: "Life at River Edge Village — photos of the farm, the community and the development progress.",
};
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  let images = [];
  try {
    images = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    // Table is auto-provisioned on first upload; treat any error as "no images yet".
    images = [];
  }

  return (
    <>
      <section className="bg-forest-800 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-300 mb-2">Gallery</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Life at River Edge Village</h1>
          <p className="mt-3 text-forest-100 max-w-2xl text-lg">
            A look at the land, the community and the progress as River Edge Rural Village takes shape.
          </p>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {images.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-600 font-medium">Our photo gallery is coming soon.</p>
              <p className="mt-1 text-sm text-gray-500">Check back shortly to see life at River Edge Village.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => (
                <figure key={img.id} className="card overflow-hidden flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.title || img.description || "River Edge Village"}
                    className="h-60 w-full object-cover"
                    loading="lazy"
                  />
                  {(img.title || img.description) && (
                    <figcaption className="p-4">
                      {img.title && <h2 className="font-semibold text-forest-900">{img.title}</h2>}
                      {img.description && <p className="mt-1 text-sm text-gray-600 leading-relaxed">{img.description}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
