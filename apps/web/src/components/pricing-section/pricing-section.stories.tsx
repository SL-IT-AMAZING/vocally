import type { Meta, StoryObj } from "@storybook/react";
import PricingSection from "./index";

const meta = {
  title: "Marketing/PricingSection",
  component: PricingSection,
} satisfies Meta<typeof PricingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
