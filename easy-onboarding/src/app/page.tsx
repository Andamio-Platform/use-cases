import Image from "next/image";
import { WalletConnectPanel } from "@/components/wallet-connect-panel";

const onboardingFlow = [
  "Connect wallet",
  "Get or detect access token",
  "Accept prerequisite terms",
  "Claim completion credential",
  "Open project workspace",
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--andamio-surface)] text-[var(--andamio-text)]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(165deg,#ffffff_0%,#f7fafc_56%,#eef5fb_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,transparent_49%,rgba(0,78,137,0.06)_49%,rgba(0,78,137,0.06)_51%,transparent_51%)]" />
        <div className="andamio-drift absolute -right-20 -top-24 h-[360px] w-[360px] bg-[var(--andamio-orange)] [clip-path:polygon(15%_0%,100%_9%,100%_92%,28%_100%,0%_40%)] opacity-90" />
        <div className="andamio-float absolute -left-24 bottom-[-5.5rem] h-[280px] w-[340px] bg-[var(--andamio-blue)] [clip-path:polygon(0%_100%,64%_68%,100%_100%)] opacity-92" />
        <div className="andamio-pulse absolute left-[12%] top-[16%] h-9 w-9 rounded-full bg-[var(--andamio-orange-soft)]" />
        <div className="andamio-float-delay absolute left-[22%] top-[67%] h-6 w-6 rounded-full bg-[var(--andamio-blue-bright)]" />
        <div className="andamio-float absolute right-[14%] top-[22%] h-8 w-8 rounded-full bg-[#0f1419]" />
        <div className="andamio-pulse-delay absolute right-[11%] top-[57%] h-11 w-11 rounded-full bg-[var(--andamio-orange-soft)]" />
        <div className="andamio-drift absolute right-[21%] top-[13%] h-16 w-16 rounded-full bg-[#ffd1bf] opacity-80" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-7 px-6 py-8 sm:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10 lg:py-14">
        <section className="rounded-[2rem] border border-[rgba(0,78,137,0.14)] bg-white/82 p-7 shadow-[0_22px_70px_rgba(0,78,137,0.12)] backdrop-blur-sm sm:p-9">
          <div className="relative h-7 w-[132px]">
            <Image
              src="/andamio-logo-primary.svg"
              alt="Andamio"
              fill
              sizes="132px"
              unoptimized
              className="object-contain object-left"
            />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--andamio-orange)]">
            Easy onboarding
          </p>
          <h1
            className="font-[family-name:var(--font-chivo)] text-4xl leading-[1.1] sm:text-5xl"
            style={{ marginTop: "0.75rem" }}
          >
            Easy onboarding for Andamio programs
          </h1>
          <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-slate-700 sm:text-base">
            Connect a Cardano wallet, verify or mint an access token, complete the prerequisite
            course flow, and unlock project access in one guided dashboard.
          </p>

          <h2
            className="font-[family-name:var(--font-chivo)] text-2xl leading-[1.1] sm:text-3xl"
            style={{ marginTop: "2rem" }}
          >
            Before you start
          </h2>
          <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-slate-700 sm:text-base">
            You need a Cardano wallet. The app uses it to sign onboarding transactions and verify
            whether your Andamio access token and prerequisite credential are present.
          </p>

          <p className="mt-8 text-xs text-[var(--andamio-blue)]">
            <a
              className="font-semibold underline decoration-[var(--andamio-blue)]/30 underline-offset-2 hover:text-[var(--andamio-blue-strong)]"
              href="https://www.andamio.io"
              target="_blank"
              rel="noreferrer"
            >
              Visit Andamio
            </a>
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/20 bg-[linear-gradient(165deg,#004E89_0%,#035d99_52%,#0F1419_100%)] p-7 text-white shadow-[0_28px_85px_rgba(0,46,84,0.34)] sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#dcecff]">
            Wallet onboarding
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-chivo)] text-3xl leading-tight">
            Connect wallet to get started
          </h2>
          <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-[#e7f3ff]">
            Move through token setup, prerequisite confirmation, and project access from one
            place.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {onboardingFlow.map((step, index) => (
              <span
                key={step}
                className="w-fit rounded-full border border-white/24 bg-white/12 px-3 py-1 text-[11px] font-medium text-[#e5ebff]"
              >
                0{index + 1} {step}
              </span>
            ))}
          </div>
          <WalletConnectPanel />
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4">
        <div className="flex items-center gap-2 rounded-full border border-[rgba(0,78,137,0.12)] bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[var(--andamio-blue)] shadow-[0_8px_26px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <span className="opacity-90">Powered by</span>
          <span className="relative block h-4 w-[72px] shrink-0 overflow-hidden">
            <Image
              src="/andamio-logo-primary.svg"
              alt="Andamio"
              fill
              sizes="72px"
              unoptimized
              className="object-contain object-left"
            />
          </span>
        </div>
      </footer>
    </main>
  );
}
