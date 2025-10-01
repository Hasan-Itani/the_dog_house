import Image from "next/image";

export default function Home() {
  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-[#0b0f1a]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />
      <div className="absolute bottom-10 w-full z-0 flex justify-center">
        <img
          src="/bet_bg.png"
          alt="bet background"
          className="w-[90%] object-cover"
        />
      </div>
    </main>
  );
}
