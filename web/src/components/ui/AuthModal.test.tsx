import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthModal from "./AuthModal";
import { AuthProvider } from "@/contexts/AuthContext";

// Regression: pressing Escape did nothing while the auth modal was open —
// only the X button and the backdrop closed it. Fixed by adding a
// window keydown listener in AuthModal.tsx that calls onClose() on Escape.
describe("AuthModal", () => {
  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={onClose} />
      </AuthProvider>
    );

    expect(screen.getByPlaceholderText("아이디를 입력하세요")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose for other keys", () => {
    const onClose = vi.fn();
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={onClose} />
      </AuthProvider>
    );

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not attach a listener when closed", () => {
    const onClose = vi.fn();
    const { container } = render(
      <AuthProvider>
        <AuthModal isOpen={false} onClose={onClose} />
      </AuthProvider>
    );

    expect(container).toBeEmptyDOMElement();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
