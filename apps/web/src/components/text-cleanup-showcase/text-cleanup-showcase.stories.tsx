import type { Meta, StoryObj } from "@storybook/react";
import TextCleanupShowcase from "./index";

const meta = {
  title: "Marketing/TextCleanupShowcase",
  component: TextCleanupShowcase,
} satisfies Meta<typeof TextCleanupShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
