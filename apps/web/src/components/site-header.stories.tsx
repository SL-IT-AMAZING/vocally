import type { Meta, StoryObj } from "@storybook/react";
import { SiteHeader } from "./site-header";

const meta = {
  title: "Layout/SiteHeader",
  component: SiteHeader,
} satisfies Meta<typeof SiteHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
