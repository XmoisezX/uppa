import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy de tiles de mapa com injeção segura de Referer autorizado.
 * Permite renderização impecável sem marcas d'água tanto em desenvolvimento (localhost)
 * quanto em ambientes de homologação, garantindo fallback para OSM.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coords: string[] }> }
) {
  const { coords } = await params;

  if (!coords || coords.length < 4) {
    return new NextResponse("Invalid tile coordinates", { status: 400 });
  }

  const [s, z, x, yWithExt] = coords;
  const y = yWithExt.replace(/\.png$/i, "").replace(/@\d+x$/i, "");

  const cartoKey =
    process.env.NEXT_PUBLIC_CARTO_API_KEY ||
    "cb1_3qa9_1_431f37359957466841c5e31b";

  // URL oficial CARTO Voyager com autenticação
  const cartoUrl = `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png?key=${cartoKey}`;

  try {
    const res = await fetch(cartoUrl, {
      headers: {
        Referer: "https://uppa-six.vercel.app/",
        "User-Agent": "PortalImobiliario/1.0 (CARTO Basemaps)",
      },
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control":
            "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }

    // Fallback: OpenStreetMap caso a CARTO não responda
    const osmSubdomain = ["a", "b", "c"].includes(s) ? s : "a";
    const osmUrl = `https://${osmSubdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        "User-Agent": "PortalImobiliario/1.0",
      },
    });

    if (osmRes.ok) {
      const buffer = await osmRes.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control":
            "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }

    return new NextResponse("Failed to load map tile", { status: 502 });
  } catch (err: any) {
    return new NextResponse(`Error fetching tile: ${err?.message}`, {
      status: 500,
    });
  }
}
