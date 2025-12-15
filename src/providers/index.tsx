import { ColorsProvider } from "./ColorsProvider";
import { ThemeProvider } from "./ThemeProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ThemeProvider>
        <ColorsProvider>{children}</ColorsProvider>
      </ThemeProvider>
    </>
  );
};

export default Providers;
