import { Box, type BoxProps } from "@mui/material";
import vocallyIcon from "../../assets/vocally-icon.png";

export type LogoProps = BoxProps;

export const Logo = ({
  sx,
  width = "2.2rem",
  height = "2.2rem",
  ...rest
}: LogoProps) => {
  return (
    <Box
      component="img"
      src={vocallyIcon}
      alt="Vocally"
      draggable={false}
      width={width}
      height={height}
      sx={{
        objectFit: "contain",
        borderRadius: "22%",
        ...sx,
      }}
      {...rest}
    />
  );
};
