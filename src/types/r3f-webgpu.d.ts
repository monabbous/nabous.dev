import "@react-three/fiber";

type IntrinsicProps = { [key: string]: unknown };

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshStandardNodeMaterial: IntrinsicProps;
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      meshStandardNodeMaterial: IntrinsicProps;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      meshStandardNodeMaterial: IntrinsicProps;
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      meshStandardNodeMaterial: IntrinsicProps;
    }
  }
}

export {};
