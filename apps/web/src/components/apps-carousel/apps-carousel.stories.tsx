import type { Meta, StoryObj } from "@storybook/react";
import AppsCarousel from "./apps-carousel";

const meta = {
  title: "Marketing/AppsCarousel",
  component: AppsCarousel,
} satisfies Meta<typeof AppsCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
