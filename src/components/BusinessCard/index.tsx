import { SVGGlassMorphText } from "../SVGGlassMorphText";

export const BusinessCard = ({ play }: { play: boolean }) => {
  return (
    <>
      <div
        className={
          "my-auto card gap-x-2 max-md:gap-x-4 @container glassmorph glassmorph-border w-full grid grid-cols-[minmax(100px,1fr)_2fr] md:grid-cols-1 md:my-auto relative max-md:mb-4 business-card"
        }
        style={{
          alignSelf: "start",
          gridAutoColumns: "min-content",
          gridAutoRows: "min-content",
          // gridTemplateColumns: "minmax(250px, 1fsr) 1fr",
          // backgroundColor: "rgba(0, 0, 0, 0.2)",
          // WebkitBackdropFilter: "blur(10px)",
          // backdropFilter: "blur(10px)",
          insetInlineStart: play ? "-100%" : "0",
          filter: play ? "opacity(0)" : "opacity(1)",
          transitionProperty: "inset-inline-start, filter",
          transitionDuration: "500ms",
          transitionTimingFunction: "ease-in-out",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="nabous.webp"
          alt="Portrait of Mohamed Nabous"
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
              hidden
          "
        >
          Mohamed Nabous
        </h1>
        <SVGGlassMorphText className="w-full  mt-5">
          Mohamed Nabous
        </SVGGlassMorphText>
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
              md:col-span-1
              col-span-2
              "
        >
          Seasoned developer, specialized in frontend with 10 years&apos;
          experience across 60+ diverse projects.
        </p>
        <div className="flex justify-around w-full text-2xl my-4 flex-wrap w-full col-span-2 md:col-span-1 links">
          <a href="https://www.linkedin.com/in/mohamed-nabous/" target="_blank">
            {/* <i className="fa-brands fa-linkedin" /> */}
            {/* "\f08c" */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xf08c;
            </SVGGlassMorphText>
          </a>
          <a href="https://github.com/monabbous" target="_blank">
            {/* <i className="fa-brands fa-github" /> */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xf09b;
            </SVGGlassMorphText>
          </a>
          <a href="https://dev.to/nabous" target="_blank">
            {/* <i className="fa-brands fa-dev" /> */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xf6cc;
            </SVGGlassMorphText>
          </a>
          <a href="https://twitter.com/spideymanthe1st" target="_blank">
            {/* <i className="fa-brands fa-x-twitter" /> */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xe61b;
            </SVGGlassMorphText>
          </a>
          <a href="https://www.facebook.com/spideymanThe1st" target="_blank">
            {/* <i className="fa-brands fa-facebook" /> */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xf09a;
            </SVGGlassMorphText>
          </a>
          <a href="https://www.instagram.com/spideymanThe1st" target="_blank">
            {/* <i className="fa-brands fa-instagram" /> */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xf16d;
            </SVGGlassMorphText>
          </a>
          <a href="https://wa.me/+218928832185" target="_blank">
            {/* <i className="fa-brands fa-whatsapp" /> */}
            <SVGGlassMorphText
              width={"26"}
              height={"26"}
              textProps={{
                fontFamily: "'Font Awesome 6 Brands'",
                fontWeight: "400",
                fontSize: "25",
                strokeWidth: "10%",
              }}
            >
              &#xf232;
            </SVGGlassMorphText>
          </a>
        </div>
      </div>
    </>
  );
};
