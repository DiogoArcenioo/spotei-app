import { Image, type ImageProps } from "expo-image";
const amostras: Record<string, number> = {
  "amostra:1": require("../../assets/carros/porsche.jpg"),
  "amostra:2": require("../../assets/carros/bmw.jpg"),
  "amostra:3": require("../../assets/carros/ferrari.jpg"),
  "amostra:4": require("../../assets/carros/golf.jpg"),
  "amostra:5": require("../../assets/carros/onix.jpg"),
  "amostra:6": require("../../assets/carros/mustang.jpg"),
};
export function FotoCarro({ foto, ...props }: ImageProps & { foto: string }) {
  return (
    <Image
      source={amostras[foto] ?? foto}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      {...props}
    />
  );
}
