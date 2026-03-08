// Tipos que correspondem aos valores string no schema Prisma (SQLite nao suporta enums)

export type Role = "SS" | "SERVO" | "HELPER"

export type SubStockType = "ARMARIO" | "MOSTRUARIO" | "GRUPO_CAMPO"

export type MovementType =
  | "RECEIVE_SHIPMENT"
  | "ISSUE_PUBLISHER"
  | "ISSUE_GROUP"
  | "ISSUE_CART"
  | "ISSUE_DISPLAY"
  | "TRANSFER_IN"
  | "ADJUSTMENT"
  | "COUNT_CORRECTION"

export type OrderStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED"

export type ReportStatus = "DRAFT" | "FINAL"
