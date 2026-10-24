import { fireEvent, screen } from "@testing-library/react";
import { makeBook, renderWithApp } from "../test-utils";
import BookCard from "./BookCard";

const actions = () => ({ onLend: vi.fn(), onReturn: vi.fn(), onDetails: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() });

describe("BookCard", () => {
  it("shows an overdue loan with borrower and due date, and offers Returned", () => {
    const a = actions();
    const book = makeBook({ status: "loaned", borrower: "Luca", overdue: true, due_on: "2026-01-10" });
    renderWithApp(<BookCard book={book} {...a} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText(/With Luca/)).toHaveTextContent("due 10 Jan 2026");
    fireEvent.click(screen.getByRole("button", { name: /Returned/ }));
    expect(a.onReturn).toHaveBeenCalledWith(book);
  });

  it("hides lending and the timer for wishlist books", () => {
    renderWithApp(<BookCard book={makeBook({ wishlist: true, read_status: "wishlist" })} {...actions()} />);
    expect(screen.queryByRole("button", { name: /Lend/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start/ })).not.toBeInTheDocument();
  });

  it("starts the timer for this book", () => {
    const { state } = renderWithApp(<BookCard book={makeBook()} {...actions()} />);
    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(state.startTimer).toHaveBeenCalledWith(1, "Dune");
  });
});
