import { CssVarsProvider } from "./ColorsProvider";
import { ColorModeProvider } from "./ColorModeProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {/* <ThemeProvider> */}
      <ColorModeProvider><CssVarsProvider>{children}</CssVarsProvider></ColorModeProvider>
      {/* </ThemeProvider> */}
    </>
  );
};

export default Providers;
