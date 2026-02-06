import { Box, type StackProps } from "@mui/material";
import brandLogoFull from "../../assets/brand-logo-full.png";

export type LogoWithTextProps = StackProps;

export const LogoWithText = ({ sx, ...rest }: LogoWithTextProps) => {
  return (
    <Box
      component="img"
      src={brandLogoFull}
      alt="vocally"
      draggable={false}
      sx={[
        (theme) => ({
          height: "5rem",
          width: "auto",
          objectFit: "contain",
          userSelect: "none",
          ...theme.applyStyles("dark", {
            filter: "brightness(0) invert(1)",
          }),
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    />
  );
};
