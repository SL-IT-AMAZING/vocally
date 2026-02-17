import type { Meta, StoryObj } from "@storybook/react";
import SpeedShowcase from "./index";

const meta = {
  title: "Marketing/SpeedShowcase",
  component: SpeedShowcase,
} satisfies Meta<typeof SpeedShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
