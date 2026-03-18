import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

/**
 * GET /api/unit-conversions?productId=X&fromUnit=case&toUnit=each
 * Returns product-specific conversion if exists, else global (productId=null), else null.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = request.nextUrl
  const productId = searchParams.get("productId")
  const fromUnit = searchParams.get("fromUnit")?.toLowerCase().trim()
  const toUnit = searchParams.get("toUnit")?.toLowerCase().trim()

  if (!fromUnit || !toUnit) {
    return NextResponse.json({ error: "fromUnit and toUnit are required" }, { status: 400 })
  }

  // Try product-specific first
  if (productId) {
    const specific = await prisma.unitConversion.findUnique({
      where: { productId_fromUnit_toUnit: { productId, fromUnit, toUnit } },
    })
    if (specific) {
      return NextResponse.json({
        data: { factor: Number(specific.factor), isProductSpecific: true },
      })
    }
  }

  // Fall back to global (productId = null)
  const global = await prisma.unitConversion.findFirst({
    where: { productId: null, fromUnit, toUnit },
  })
  if (global) {
    return NextResponse.json({
      data: { factor: Number(global.factor), isProductSpecific: false },
    })
  }

  return NextResponse.json({ data: null })
}

/**
 * POST /api/unit-conversions
 * Upserts a unit conversion (product-specific or global).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const productId = body.productId || null
  const fromUnit = body.fromUnit?.toLowerCase().trim()
  const toUnit = body.toUnit?.toLowerCase().trim()
  const factor = Number(body.factor)

  if (!fromUnit || !toUnit || !factor || factor <= 0) {
    return NextResponse.json(
      { error: "fromUnit, toUnit, and a positive factor are required" },
      { status: 400 }
    )
  }

  const conversion = await prisma.unitConversion.upsert({
    where: {
      productId_fromUnit_toUnit: { productId, fromUnit, toUnit },
    },
    create: {
      productId,
      fromUnit,
      toUnit,
      factor,
      createdBy: user.id,
    },
    update: {
      factor,
    },
  })

  return NextResponse.json({ data: conversion }, { status: 201 })
}
