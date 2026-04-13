export default function PlayLayout({ children }: { children: React.ReactNode }) {
  // No sidebar for the course player — full screen experience
  return (
    <div className="h-screen w-screen overflow-hidden">
      {children}
    </div>
  );
}
