import { Path, Svg, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

const BLACK = "#000000";
const WHITE = "#FFFFFF";

const circleStyle = {
  width: 26,
  height: 26,
  borderRadius: 13,
  borderWidth: 1.5,
  borderColor: BLACK,
  backgroundColor: BLACK,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  marginBottom: 5,
};

function IconCircle({ children }: { children: ReactNode }) {
  return <View style={circleStyle}>{children}</View>;
}

export function FooterLocationIcon() {
  return (
    <IconCircle>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
          fill={WHITE}
        />
      </Svg>
    </IconCircle>
  );
}

export function FooterEmailIcon() {
  return (
    <IconCircle>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path
          d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
          fill={WHITE}
        />
      </Svg>
    </IconCircle>
  );
}

export function FooterPhoneIcon() {
  return (
    <IconCircle>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path
          d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z"
          fill={WHITE}
        />
      </Svg>
    </IconCircle>
  );
}
