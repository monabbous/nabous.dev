"use client";

import { ServerScene } from "@nabous.dev/components/ServerScene";

export default function Home() {
  return (
    <>
      <div className="fixed -z-1 top-0 left-0">
        <ServerScene />
      </div>
      <div className="container mx-auto ">
        <div className="grid justify-center md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_2fr] px-2 md:px-4 min-h-screen">
          <div
            className="my-auto card gap-x-2 sm:gap-x-4 glassmorphism w-full grid grid-cols-[minmax(100px,1fr)_2fr] md:grid-cols-1 mt-[calc(100vh_-_350px)] md:my-auto"
            style={{
              alignSelf: "start",
              gridAutoColumns: "min-content",
              gridAutoRows: "min-content",
              // gridTemplateColumns: "minmax(250px, 1fsr) 1fr",
              // backgroundColor: "rgba(0, 0, 0, 0.2)",
              // WebkitBackdropFilter: "blur(10px)",
              // backdropFilter: "blur(10px)",
            }}
          >
            <img
              src="https://nabous.dev/images/nabous.webp"
              className="
                  h-auto
                  object-cover
                  aspect-w-1
			            shadow-lg
                  sm:row-[1/5]
                  row-[1/4]
                  md:row-[unset]
                  col-span-1
              "
            />
            <h1
              className="
              sm:text-3xl
              text-2xl
              font-bold
              text-center
              mt-5
              md:text-left
              glassmorphism-text
              col-span-1
          "
            >
              Mohamed Nabous
            </h1>
            <h3
              className="
              sm:text-xl
              font-bold
              sm:font-medium
              text-center
              mt-2
              md:text-left
              glassmorphism-text
              col-span-1
              "
            >
              Senior Fullstack Developer{" "}
            </h3>
            <p
              className="
              text-center
              mt-2
              md:text-left
              glassmorphism-text
              ss:col-span-1
              col-span-2
              "
            >
              Seasoned developer, specialized in frontend with 10 years&apos;
              experience across 60+ diverse projects.
            </p>
            <div className="flex justify-center md:justify-start w-100 gap-6 text-2xl my-4 flex-wrap glassmorphism-text w-full col-span-2 md:col-span-1">
              <a
                href="https://www.linkedin.com/in/mohamed-nabous/"
                target="_blank"
              >
                <i className="fa-brands fa-linkedin" />
              </a>
              <a href="https://github.com/monabbous" target="_blank">
                <i className="fa-brands fa-github" />
              </a>
              <a href="https://dev.to/nabous" target="_blank">
                <i className="fa-brands fa-dev" />
              </a>
              <a href="https://twitter.com/spideymanthe1st" target="_blank">
                <i className="fa-brands fa-x-twitter" />
              </a>
              <a
                href="https://www.facebook.com/spideymanThe1st"
                target="_blank"
              >
                <i className="fa-brands fa-facebook" />
              </a>
              <a
                href="https://www.instagram.com/spideymanThe1st"
                target="_blank"
              >
                <i className="fa-brands fa-instagram" />
              </a>
              <a href="https://wa.me/+218928832185" target="_blank">
                <i className="fa-brands fa-whatsapp" />
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* <div className="container mx-auto py-10 ">
        <div className="grid justify-center md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_2fr] px-2 md:px-4 min-h-screen">
          <div className="card glassmorphism w-full my-auto p-6">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Veritatis
            perferendis aliquid incidunt aperiam provident accusamus tempore,
            saepe nesciunt aspernatur hic eum expedita. Exercitationem provident
            minima reiciendis? Voluptas laborum neque adipisci?
          </div>
        </div>
      </div> */}
    </>
  );
}
