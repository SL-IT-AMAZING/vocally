import type { Meta, StoryObj } from "@storybook/react";
import PrivacyShowcase from "./index";

const meta = {
  title: "Marketing/PrivacyShowcase",
  component: PrivacyShowcase,
} satisfies Meta<typeof PrivacyShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
