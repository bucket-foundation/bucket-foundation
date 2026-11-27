# limit-order-book

https://github.com/Kautenja/limit-order-book. License MIT. Stars 315. Last push 2026-10-19. C++. Checked 2026-11-27.

## Architecture
Header-only C++ in `include/`: `limit_order_book.hpp` (class `LimitOrderBook`), `limit_tree.hpp`, `binary_search_tree.hpp`, `doubly_linked_list.hpp`, `structures.hpp`, plus a C header and `src/limit_order_book_c.cpp`. Cython bindings in `limit_order_book/_native.pyx`. Vendored robin-map for the id index.

## Data Layer
In-memory price levels as trees of linked order queues with a hash map from order id to order.

## Event Loop
None. Calls: `limit_buy`, `limit_sell`, `limit` by side, cancel, and market orders.

## Execution
Matching with price-time priority; fills reduce resting orders. Benchmarks in `benchmark/` compare against tree structures and Python.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
None.

## Fit
Matching engine core for simulators and exchange mocks. Reuse the C API from other languages.
