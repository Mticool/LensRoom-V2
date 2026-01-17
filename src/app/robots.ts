import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lensroom.ru";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/profile/",
          "/library/",
          "/account/",
          "/payment/",
          "/create/",
          "/studio/",
          "/create/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/create/", "/studio/", "/create/"],
      },
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/api/", "/admin/", "/create/", "/studio/", "/create/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

