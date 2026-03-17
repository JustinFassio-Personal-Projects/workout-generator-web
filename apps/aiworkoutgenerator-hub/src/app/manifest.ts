import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Workout Generator",
    short_name: "AI Workout",
    description: "Your Personal AI Fitness Team",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/images/favicon-for-app/icon1.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/favicon-for-app/icon1.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
