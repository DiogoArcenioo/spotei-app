import Svg, { Path, Text as TextoSvg } from "react-native-svg";
export function Logo({
  largura = 260,
  cor = "#FFFFFF",
}: {
  largura?: number;
  cor?: string;
}) {
  // Versão vetorial baseada na referência enviada, para manter a marca nítida.
  return (
    <Svg
      width={largura}
      height={largura * 0.34}
      viewBox="0 0 600 205"
      accessibilityLabel="Spotei Car Spotting"
    >
      <Path
        fill={cor}
        d="M20 65 Q94 58 186 27 Q294 -7 352 16 Q392 28 425 54 Q532 42 591 91 L551 76 Q512 56 423 61 Q323 78 194 64 Q308 67 390 54 Q344 9 287 14 Q217 15 136 45 Q201 40 244 57 Q145 35 48 69 L71 80 L32 79 L21 91 L26 72 Z"
      />
      <TextoSvg
        x="298"
        y="152"
        textAnchor="middle"
        fill={cor}
        fontFamily="Arial"
        fontSize="91"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="3"
      >
        SPOTEI
      </TextoSvg>
      <TextoSvg
        x="302"
        y="186"
        textAnchor="middle"
        fill={cor}
        fontFamily="Arial"
        fontSize="17"
        letterSpacing="12"
      >
        CAR SPOTTING
      </TextoSvg>
    </Svg>
  );
}
