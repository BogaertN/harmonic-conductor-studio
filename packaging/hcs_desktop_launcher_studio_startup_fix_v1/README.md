# HCS Desktop Launcher Studio Startup Fix v1

This patch makes the one-click desktop launcher open Harmonic Conductor Studio directly into the Studio / Glass Reader workflow.

It also changes the launcher policy so the desktop icon does not silently prefer a stale release binary during active development. By default it launches through the locked HCS Node toolchain and current source tree. A release binary may still be used only when `HCS_USE_RELEASE_BINARY=1` is explicitly set after the production release path has been verified.

Authority boundaries: this patch does not mutate Forge, does not write Identity Vault, does not change `.hfield` source authority, does not alter audio determinism, and does not change sealed-bundle custody semantics.
