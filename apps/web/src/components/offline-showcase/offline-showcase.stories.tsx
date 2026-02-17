import type { Meta, StoryObj } from "@storybook/react";
import OfflineShowcase from "./index";

const meta = {
  title: "Marketing/OfflineShowcase",
  component: OfflineShowcase,
} satisfies Meta<typeof OfflineShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
