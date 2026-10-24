import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthModal from "./AuthModal";
import { AuthProvider } from "@/contexts/AuthContext";

// Regression: pressing Escape did nothing while the auth modal was open —
// only the X button and the backdrop closed it. Fixed by adding a
// window keydown listener in AuthModal.tsx that calls onClose() on Escape.
describe("AuthModal", () => {
  // Regression: a non-JSON login response (gateway error page) threw inside login(),
  // leaving the submit button stuck on "로그인 중..." with no error shown.
  it("shows an error instead of hanging when the login response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url === "/api/auth/login"
        ? new Response("<html>502 Bad Gateway</html>", { status: 502 })
        : new Response(JSON.stringify({ member: null }))
    ));
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );
    fireEvent.change(screen.getByPlaceholderText("아이디를 입력하세요"), { target: { value: "iru" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호를 입력하세요"), { target: { value: "abc" } });
    fireEvent.click(document.querySelector("#login-submit")!);

    expect(await screen.findByText("서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(document.querySelector("#login-submit")).toHaveTextContent("로그인");
    vi.unstubAllGlobals();
  });

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
