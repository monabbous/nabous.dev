"use client";

import { ServerScene } from "@nabous.dev/components/ServerScene";
import { SVGGlassMorphText } from "@nabous.dev/components/SVGGlassMorphText";
import {
  type HTMLAttributes,
  type MutableRefObject,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const copy = {
  en: {
    language: "العربية",
    about: "About",
    projects: "Nabous Websites",
    name: "Mohamed Nabous",
    portraitAlt: "Portrait of Mohamed Nabous",
    role: "Technical Project Manager & Full-Stack Engineering Lead",
    bio: "10+ years building production web products, from e-commerce and ordering to ERP systems for food manufacturing and supply chains.",
    websitesEyebrow: "Independent venture · Nabous.dev Websites",
    websitesTitle: "A polished website for your business.",
    websitesBody:
      "Bilingual, mobile-first websites for Libyan businesses — from 150 LYD.",
    websitesCta: "Explore websites.nabous.dev",
    menuEyebrow: "For restaurants",
    menuTitle: "Digital menu + WhatsApp order checkout.",
    menuBody:
      "Show every dish with its photo, price and description; customers build an order and send it to WhatsApp, ready to confirm.",
    menuCta: "Explore the digital menu demo",
    menuAlt: "Preview of the digital menu and WhatsApp ordering demo",
    proofTitle: "Selected employment & contract work",
    pixelTitle: "Pixel Store",
    pixelBody: "E-commerce platform built with Sadeem Tech.",
    kudoTitle: "Kudo Ordering",
    kudoBody: "Freelance food-ordering experience with cart-based checkout.",
    avantTitle: "OneAvant ERP",
    avantBody:
      "Technical Project Manager and Full-Stack Engineering Lead for food-catering and supply-chain features.",
    externalLabel: "Opens in a new tab",
    pause: "Pause",
    rotateTitle: "Rotate to landscape",
    rotateBody:
      "For the best experience, rotate your device to landscape. Touch controls will reappear once landscape is detected.",
    backHome: "Back to home",
    paused: "Paused",
    mouseFree: "Mouse is free. Press Resume to recapture the cursor. Press P anytime to toggle pause.",
    movement: "Movement",
    actions: "Actions",
    quit: "Quit",
    resume: "Resume",
  },
  ar: {
    language: "English",
    about: "نبذة",
    projects: "Nabous Websites",
    name: "محمد نبوس",
    portraitAlt: "صورة محمد نبوس",
    role: "مدير مشاريع تقني وقائد هندسة برمجيات شاملة",
    bio: "أكثر من 10 سنوات في بناء منتجات ويب فعلية؛ من التجارة الإلكترونية والطلبات إلى أنظمة ERP للتصنيع الغذائي وسلاسل الإمداد.",
    websitesEyebrow: "مشروعي الخاص · Nabous.dev Websites",
    websitesTitle: "موقع مرتب لنشاطك التجاري.",
    websitesBody:
      "مواقع عربية وإنجليزية، مصممة للموبايل للأعمال الليبية — تبدأ من 150 د.ل.",
    websitesCta: "اكتشف websites.nabous.dev",
    menuEyebrow: "للمطاعم",
    menuTitle: "منيو إلكتروني + سلة طلب على واتساب.",
    menuBody:
      "اعرض كل صنف بصورته وسعره ووصفه؛ يجمع الزبون طلبه ويرسله إلى واتساب جاهزاً للتأكيد.",
    menuCta: "شاهد مثال المنيو الإلكتروني",
    menuAlt: "عرض لمثال المنيو الإلكتروني والطلب على واتساب",
    proofTitle: "نماذج من أعمال التوظيف والتعاقد",
    pixelTitle: "Pixel Store",
    pixelBody: "منصة تجارة إلكترونية طُورت مع Sadeem Tech.",
    kudoTitle: "Kudo Ordering",
    kudoBody: "تجربة طلبات طعام مستقلة، بسلة وإتمام طلب مباشر.",
    avantTitle: "OneAvant ERP",
    avantBody:
      "مدير مشاريع تقني وقائد هندسة برمجيات لميزات التموين الغذائي وسلسلة الإمداد.",
    externalLabel: "يفتح في نافذة جديدة",
    pause: "إيقاف مؤقت",
    rotateTitle: "دوّر الشاشة للوضع الأفقي",
    rotateBody:
      "لأفضل تجربة، دوّر جهازك للوضع الأفقي. ستظهر أدوات اللمس مجدداً بعد اكتشاف الوضع الأفقي.",
    backHome: "العودة للرئيسية",
    paused: "متوقف مؤقتاً",
    mouseFree: "المؤشر متاح. اضغط متابعة لإعادته إلى المشهد، واضغط P للإيقاف أو المتابعة.",
    movement: "الحركة",
    actions: "الإجراءات",
    quit: "خروج",
    resume: "متابعة",
  },
} as const;

type Locale = keyof typeof copy;

export default function Home() {
  const CANVAS_ID = "server-scene-canvas";
  // const [play, setPlay] = useLocalStorage<boolean>("play-state", false, {
  //   serializer: (val) => (val ? "true" : "false"),
  //   parser: (str) => str === "true",
  // });
  const [play, setPlay] = useState<boolean>(false);
  const [locale, setLocale] = useState<Locale>("en");

  const [paused, setPaused] = useState(false);

  const [hasKeyboard, setHasKeyboard] = useState(false);
  const [hasGamepad, setHasGamepad] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [needsLandscape, setNeedsLandscape] = useState(false);
  const [_showTutorial, setShowTutorial] = useState(false);
  const touchMoveRef = useRef({ x: 0, z: 0 });
  const touchLookRef = useRef({ x: 0, y: 0 });
  const touchFireRef = useRef(false);
  const [_score, setScore] = useState(0);
  const [_timeAliveMs, setTimeAliveMs] = useState(0);
  const t = copy[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const requestPointerLock = useCallback(() => {
    const canvas = document.getElementById(
      CANVAS_ID
    ) as HTMLCanvasElement | null;
    canvas?.requestPointerLock?.();
  }, [CANVAS_ID]);

  const exitPointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, []);

  const handleEnterGame = useCallback(() => {
    setPaused(false);
    setPlay(true);
    setShowTutorial(true);
    setScore(0);
    setTimeAliveMs(0);
    requestFullscreen();
    requestPointerLock();
  }, [requestFullscreen, requestPointerLock, setPlay]);

  const pauseGame = useCallback(() => {
    setPaused(true);
    exitPointerLock();
  }, [exitPointerLock]);

  const resumeGame = useCallback(() => {
    if (!play) return;
    setPaused(false);
    requestPointerLock();
  }, [play, requestPointerLock]);

  const quitToHome = useCallback(() => {
    setPaused(false);
    setPlay(false);
    setShowTutorial(true);
    setScore(0);
    setTimeAliveMs(0);
    exitFullscreen();
    exitPointerLock();
  }, [exitFullscreen, exitPointerLock, setPlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(pointer: coarse)");
    const updateTouch = () => {
      setIsTouchDevice(
        mq.matches ||
          (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
      );
    };

    const markKeyboard = (event: KeyboardEvent) => {
      if (event.isTrusted) setHasKeyboard(true);
    };
    const onGamepadConnected = () => setHasGamepad(true);
    const onGamepadDisconnected = () => setHasGamepad(false);

    updateTouch();

    window.addEventListener("keydown", markKeyboard, { passive: true });
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    mq.addEventListener?.("change", updateTouch);

    return () => {
      window.removeEventListener("keydown", markKeyboard);
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
      mq.removeEventListener?.("change", updateTouch);
    };
  }, []);

  useEffect(() => {
    const updateLandscape = () => {
      if (typeof window === "undefined") return;
      setNeedsLandscape(
        isTouchDevice && window.innerWidth < window.innerHeight
      );
    };

    updateLandscape();
    window.addEventListener("resize", updateLandscape, { passive: true });
    window.addEventListener("orientationchange", updateLandscape);

    return () => {
      window.removeEventListener("resize", updateLandscape);
      window.removeEventListener("orientationchange", updateLandscape);
    };
  }, [isTouchDevice]);

  useEffect(() => {
    if (!play) {
      setPaused(false);
      exitPointerLock();
    }
  }, [exitPointerLock, play]);

  useEffect(() => {
    const handleLockChange = () => {
      if (!play) return;
      const locked = document.pointerLockElement;
      setPaused(!locked);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, [play]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!play) return;
      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        if (paused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pauseGame, paused, play, resumeGame]);

  const showTouchControls =
    play &&
    !paused &&
    !needsLandscape &&
    isTouchDevice &&
    !hasKeyboard &&
    !hasGamepad;

  useEffect(() => {
    if (!play || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      setTimeAliveMs((prev) => prev + (now - last));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pauseGame, paused, play]);

  return (
    <>
      <div className="fixed -z-1 top-0 left-0">
        <ServerScene
          play={play}
          paused={paused}
          touchMoveRef={touchMoveRef}
          touchLookRef={touchLookRef}
          touchFireRef={touchFireRef}
          onScore={(delta) => setScore((s) => s + delta)}
        />
      </div>
      <header className="fixed top-4 inset-x-0 z-20 px-4 pointer-events-none">
        <nav className="container mx-auto flex w-fit max-w-full items-center gap-1 rounded-sm p-1 glassmorph glassmorph-border pointer-events-auto">
          <a className="rounded-sm px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10" href="#about">
            {t.about}
          </a>
          <a className="rounded-sm px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10" href="#projects">
            {t.projects}
          </a>
          <button
            type="button"
            onClick={() => setLocale((current) => (current === "en" ? "ar" : "en"))}
            className="rounded-sm px-3 py-2 text-xs font-semibold text-white glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 cursor-pointer transition-glassmorph"
            aria-label={t.language}
          >
            {t.language}
          </button>
        </nav>
      </header>
      <main className="container mx-auto px-2 md:px-4">
        <section id="about" className="h-screen min-h-[540px] scroll-mt-4 grid items-center py-20 md:pb-20 pb-10">
          <div
            className={
              "card gap-x-2 sm:gap-x-4 glassmorph glassmorph-border w-full max-w-[420px] grid grid-cols-[minmax(100px,1fr)_2fr] md:grid-cols-1 relative md:self-center self-end"
            }
            style={{
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
              alt={t.portraitAlt}
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
            <h1 className="sr-only">
              {t.name}
            </h1>
            <div className="mt-5 col-span-1">
              <SVGGlassMorphText className="w-full" textProps={{ direction: "ltr" }}>
                Mohamed Nabous
              </SVGGlassMorphText>
            </div>
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
              {t.role}
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
              {t.bio}
            </p>
            <div className="flex justify-center md:justify-start gap-6 text-2xl my-4 flex-wrap w-full col-span-2 md:col-span-1">
              <a
                href="https://www.linkedin.com/in/mohamed-nabous/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
              >
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
              <a href="https://github.com/monabbous" target="_blank" rel="noreferrer" aria-label="GitHub">
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
              <a href="https://dev.to/nabous" target="_blank" rel="noreferrer" aria-label="DEV Community">
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
              <a href="https://twitter.com/spideymanthe1st" target="_blank" rel="noreferrer" aria-label="X">
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
              <a
                href="https://facebook.com/nabous.dev"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
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
              <a
                href="https://instagram.com/nabous.dev"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
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
              <a href="https://wa.me/+218928832185" target="_blank" rel="noreferrer" aria-label="WhatsApp">
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
        </section>
        <div id="space" className="min-h-[50vh]"></div>
        <section id="projects" className="min-h-screen scroll-mt-4 grid items-center py-24">
          <div className="w-full max-w-4xl space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Nabous.dev</p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">{t.projects}</h2>
            </div>
            <div className="grid overflow-hidden rounded-sm glassmorph glassmorph-border md:grid-cols-[1.05fr_0.95fr]">
              <a
                href={`https://modo.websites.nabous.dev/${locale}/`}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-[960/602] bg-slate-950 md:self-center"
                aria-label={`${t.menuCta} — ${t.externalLabel}`}
              >
                <video
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/modo-demo.jpg"
                  aria-label={t.menuAlt}
                >
                  <source src="/modo-demo.mp4" type="video/mp4" />
                </video>
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
                <span className="absolute bottom-5 inset-x-5 inline-flex w-fit items-center gap-3 border border-white/50 bg-slate-950/75 px-4 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition-colors group-hover:border-cyan-100 group-hover:bg-cyan-500/25">
                  {t.menuCta} <span aria-hidden="true" className="text-lg leading-none">↗</span>
                </span>
              </a>
              <div className="p-6 sm:p-8 text-left rtl:text-right">
                <div className="text-[0.65rem] uppercase tracking-[0.18em] text-cyan-100/70">{t.menuEyebrow}</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{t.menuTitle}</h3>
                <p className="mt-3 text-sm leading-7 text-white/75">{t.menuBody}</p>
                <a
                  href="https://websites.nabous.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 block border-t border-white/15 pt-5 group"
                  aria-label={`${t.websitesCta} — ${t.externalLabel}`}
                >
                  <div className="text-[0.65rem] uppercase tracking-[0.18em] text-white/60">{t.websitesEyebrow}</div>
                  <div className="mt-1 text-lg font-semibold text-white">{t.websitesTitle}</div>
                  <div className="mt-2 text-sm text-white/75">{t.websitesBody}</div>
                  <div className="mt-4 text-sm font-semibold text-white group-hover:text-cyan-100">{t.websitesCta} <span aria-hidden="true">↗</span></div>
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <h3 className="sm:col-span-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                {t.proofTitle}
              </h3>
              <a href="https://pixel-store.ly/" target="_blank" rel="noreferrer" className="rounded-sm p-4 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 transition-glassmorph text-left rtl:text-right" aria-label={`${t.pixelTitle} — ${t.externalLabel}`}>
                <h3 className="font-semibold text-white">{t.pixelTitle}</h3>
                <p className="mt-2 text-xs leading-5 text-white/70">{t.pixelBody}</p>
              </a>
              <a href="https://ordering.kudo.ly/" target="_blank" rel="noreferrer" className="rounded-sm p-4 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 transition-glassmorph text-left rtl:text-right" aria-label={`${t.kudoTitle} — ${t.externalLabel}`}>
                <h3 className="font-semibold text-white">{t.kudoTitle}</h3>
                <p className="mt-2 text-xs leading-5 text-white/70">{t.kudoBody}</p>
              </a>
              <a href="http://oneavant.com/" target="_blank" rel="noreferrer" className="rounded-sm p-4 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 transition-glassmorph text-left rtl:text-right" aria-label={`${t.avantTitle} — ${t.externalLabel}`}>
                <h3 className="font-semibold text-white">{t.avantTitle}</h3>
                <p className="mt-2 text-xs leading-5 text-white/70">{t.avantBody}</p>
              </a>
            </div>
          </div>
        </section>
      </main>
      {play && !paused && !needsLandscape && (
        <button
          type="button"
          className="fixed top-4 right-4 z-20 px-4 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-white  text-sm backdrop-blur-md shadow-lg active:scale-95 transition-transform"
          onClick={pauseGame}
        >
          {t.pause}
        </button>
      )}
      {/* {play && !paused && !needsLandscape && (
        <ShooterHud score={score} timeMs={timeAliveMs} />
      )} */}
      {/* {play && !paused && !needsLandscape && showTutorial && (
        <TutorialCard onClose={() => setShowTutorial(false)} isTouch={isTouchDevice} />
      )} */}
      {play && needsLandscape && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 text-white text-center px-6">
          <div className="space-y-3 max-w-md">
            <h2 className="text-2xl font-bold">{t.rotateTitle}</h2>
            <p className="text-sm text-white/80">
              {t.rotateBody}
            </p>
            <button
              type="button"
              className="mt-2 px-4 py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm backdrop-blur-md shadow-lg"
              onClick={quitToHome}
            >
              {t.backHome}
            </button>
          </div>
        </div>
      )}
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
      <TouchControls
        visible={showTouchControls}
        onRequestPlay={handleEnterGame}
        touchMoveRef={touchMoveRef}
        touchLookRef={touchLookRef}
          touchFireRef={touchFireRef}
      />
      <PauseScreen
        visible={play && paused && !needsLandscape}
        onResume={resumeGame}
        onQuit={quitToHome}
        labels={t}
      />
    </>
  );
}

function PauseScreen({
  visible,
  onResume,
  onQuit,
  labels,
}: {
  visible: boolean;
  onResume: () => void;
  onQuit: () => void;
  labels: (typeof copy)[Locale];
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-lg px-4">
      <div className="glassmorph glassmorph-border text-white w-[min(90vw,520px)] p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{labels.paused}</h2>
          <button
            type="button"
            className="px-3 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
            onClick={onQuit}
          >
            {labels.backHome}
          </button>
        </div>
        <p className="text-sm text-white/80">
          {labels.mouseFree}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="glassmorph glassmorph-border p-3 space-y-1">
            <div className="text-xs uppercase tracking-wide text-white/60">
              {labels.movement}
            </div>
            <div>WASD / Left Stick</div>
            <div>Shift to sprint</div>
            <div>Space to jump</div>
          </div>
          <div className="glassmorph glassmorph-border p-3 space-y-1">
            <div className="text-xs uppercase tracking-wide text-white/60">
              {labels.actions}
            </div>
            <div>E / B to interact</div>
            <div>P to pause/resume</div>
            <div>Esc to release mouse</div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="px-4 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-sm font-semibold cursor-pointer"
            onClick={onQuit}
          >
            {labels.quit}
          </button>
          <button
            type="button"
            className="px-4 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30  font-semibold shadow cursor-pointer"
            onClick={onResume}
          >
            {labels.resume}
          </button>
        </div>
      </div>
    </div>
  );
}

function _ShooterHud({ score, timeMs }: { score: number; timeMs: number }) {
  const seconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const secPad = String(seconds % 60).padStart(2, "0");
  return (
    <div className="fixed top-4 left-4 z-20 flex flex-col gap-2 min-w-[220px] text-white pointer-events-none">
      <div className="glassmorph glassmorph-border backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="text-xs uppercase tracking-wide text-white/60 mb-1">Status</div>
        <div className="flex items-center justify-between">
          <span>Score</span>
          <span className="font-semibold">{score}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Time</span>
          <span className="font-semibold">
            {minutes}:{secPad}
          </span>
        </div>
      </div>
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center text-white/70">
        <div className="w-5 h-5 border border-white/50 rounded-sm" />
      </div>
    </div>
  );
}

function _TutorialCard({
  onClose,
  isTouch,
}: {
  onClose: () => void;
  isTouch: boolean;
}) {
  return (
    <div className="fixed bottom-6 left-4 z-20 w-[min(360px,90vw)] text-white pointer-events-auto">
      <div className="glassmorph glassmorph-border backdrop-blur-xl shadow-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">How to play</div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md bg-white/15 border border-white/25 hover:glassmorph-glow-opacity-30"
          >
            Got it
          </button>
        </div>
        <ul className="space-y-2 text-xs leading-relaxed">
          {isTouch ? (
            <>
              <li>Left joystick: Move. Right joystick: Look/aim.</li>
              <li>Tap Jump / Interact buttons to hop or use nearby objects.</li>
              <li>Collect glowing shards, hack neon terminals, and toggle server racks.</li>
            </>
          ) : (
            <>
              <li>Move with WASD, jump with Space, sprint with Shift.</li>
              <li>Look with the mouse (pointer lock). Interact with E near shards/terminals/racks.</li>
              <li>Objectives: grab shards, hack terminals, and manage rack power.</li>
            </>
          )}
          <li>Press P or the Pause button to pause. Escape releases the mouse.</li>
        </ul>
      </div>
    </div>
  );
}

function TouchControls({
  visible,
  onRequestPlay,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
}: {
  visible: boolean;
  onRequestPlay: () => void;
  touchMoveRef: MutableRefObject<{ x: number; z: number }>;
  touchLookRef: MutableRefObject<{ x: number; y: number }>;
  touchFireRef: MutableRefObject<boolean>;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none">
      <div className="absolute bottom-6 left-4 pointer-events-auto">
        <AnalogStick
          label="Move"
          onStart={onRequestPlay}
          onChange={(x, y) => {
            // x => strafe, y => forward/back (positive up)
            touchMoveRef.current = { x, z: -y };
          }}
          onEnd={() => {
            touchMoveRef.current = { x: 0, z: 0 };
          }}
        />
      </div>
      <div className="absolute bottom-6 right-4 pointer-events-auto flex flex-col gap-3 items-end">
        <AnalogStick
          label="Look"
          onStart={onRequestPlay}
          onChange={(x, y) => {
            touchLookRef.current = { x, y };
          }}
          onEnd={() => {
            touchLookRef.current = { x: 0, y: 0 };
          }}
        />
        <div className="flex gap-2">
          <TouchButton label="Jump" aria="Jump" wide {...bindKey(onRequestPlay, " ")} />
          <TouchButton label="Interact" aria="Interact" wide {...bindKey(onRequestPlay, "e")} />
          <TouchButton
            label="Fire"
            aria="Fire"
            wide
            onPointerDown={(e) => {
              e.preventDefault();
              onRequestPlay();
              touchFireRef.current = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchFireRef.current = false;
            }}
            onPointerLeave={() => {
              touchFireRef.current = false;
            }}
            onPointerCancel={() => {
              touchFireRef.current = false;
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TouchButton({
  label,
  aria,
  wide = false,
  ...rest
}: {
  label: string;
  aria: string;
  wide?: boolean;
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={aria}
      className={`px-4 py-3 glassmorph glassmorph-border text-white text-xs uppercase tracking-wide backdrop-blur-md shadow-lg active:scale-95 transition-transform pointer-events-auto ${wide ? "min-w-[84px]" : "min-w-[64px]"}`}
      {...rest}
    >
      {label}
    </button>
  );
}

function bindKey(onRequestPlay: () => void, key: string) {
  const sendKey = (type: "keydown" | "keyup", pressed: string) => {
    const code = pressed === " " ? "Space" : pressed;
    window.dispatchEvent(new KeyboardEvent(type, { key: pressed, code }));
  };

  return {
    onPointerDown: (event: PointerEvent) => {
      event.preventDefault();
      onRequestPlay();
      sendKey("keydown", key);
    },
    onPointerUp: (event: PointerEvent) => {
      event.preventDefault();
      sendKey("keyup", key);
    },
    onPointerLeave: () => sendKey("keyup", key),
    onPointerCancel: () => sendKey("keyup", key),
  };
}

function AnalogStick({
  label,
  onChange,
  onEnd,
  onStart,
}: {
  label: string;
  onStart: () => void;
  onChange: (x: number, y: number) => void;
  onEnd: () => void;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const radiusPx = 60;

  const reset = () => {
    pointerIdRef.current = null;
    setThumb({ x: 0, y: 0 });
    onEnd();
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
    setThumb({ x: 0, y: 0 });
    onStart();
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, radiusPx);
    const nx = dist > 0 ? (dx / dist) * (clampedDist / radiusPx) : 0;
    const ny = dist > 0 ? (dy / dist) * (clampedDist / radiusPx) : 0;
    setThumb({ x: nx * radiusPx, y: ny * radiusPx });
    onChange(nx, ny);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    reset();
  };

  const handlePointerLeave = (_e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === null) return;
    reset();
  };

  return (
    <div
      className="relative w-[140px] h-[140px] rounded-full bg-white/5 border border-white/15 backdrop-blur-xl text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div className="absolute inset-2 rounded-full border border-white/15" />
      <div className="absolute inset-8 rounded-full border border-white/15" />
      <div
        className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-white/30 border border-white/40 shadow-lg pointer-events-none"
        style={{
          transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))`,
        }}
      />
    </div>
  );
}
