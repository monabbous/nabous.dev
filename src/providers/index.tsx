import { CssVarsProvider } from "./ColorsProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {/* <ThemeProvider> */}
      <CssVarsProvider>{children}</CssVarsProvider>
      {/* </ThemeProvider> */}
    </>
  );
};

export default Providers;
