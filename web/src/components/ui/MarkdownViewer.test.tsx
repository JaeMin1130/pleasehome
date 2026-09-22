import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownViewer from "./MarkdownViewer";

// Regression: MarkdownViewer used to render extract-data's internal audit
// comments (e.g. <!-- Source: document.md#L12 -->) as visible text because
// react-markdown left inline HTML unparsed. Fixed by stripping HTML comments
// before render (web/src/components/ui/MarkdownViewer.tsx).
describe("MarkdownViewer", () => {
  it("renders plain markdown content", () => {
    render(<MarkdownViewer content={"# Title\n\nHello world"} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("strips internal HTML comments instead of showing them as text", () => {
    render(
      <MarkdownViewer content={"Visible text\n\n<!-- Source: document.md#L12 -->"} />
    );
    expect(screen.getByText("Visible text")).toBeInTheDocument();
    expect(screen.queryByText(/Source: document\.md/)).not.toBeInTheDocument();
  });

  it("renders nothing when content is only an HTML comment", () => {
    const { container } = render(
      <MarkdownViewer content={"<!-- Source: document.md#L12 -->"} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for empty content", () => {
    const { container } = render(<MarkdownViewer content="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
