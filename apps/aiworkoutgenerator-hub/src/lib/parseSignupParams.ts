/**
 * URL Parameter Parser for Website-to-App Onboarding Handoff
 *
 * Parses and validates URL search parameters from the website's
 * Workout Plan Builder redirect.
 */

import type {
  Gender,
  FitnessLevel,
  ActivityLevel,
  PreferredUnits,
} from "@/types/firestore";
import type { WebsiteOnboardingData } from "@/types/websiteOnboarding";

// Valid enum values for validation
const VALID_GENDERS: Gender[] = [
  "male",
  "female",
  "non_binary",
  "prefer_not_to_say",
];
const VALID_FITNESS_LEVELS: FitnessLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "athlete",
];
const VALID_ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extremely_active",
];
const VALID_WEIGHT_UNITS: PreferredUnits["weight"][] = ["lb", "kg"];
const VALID_HEIGHT_UNITS: PreferredUnits["height"][] = ["in", "cm"];
const VALID_DISTANCE_UNITS: PreferredUnits["distance"][] = ["mi", "km"];
const VALID_TEMPERATURE_UNITS: PreferredUnits["temperature"][] = ["f", "c"];

// Valid fitness goals (must match website form)
const VALID_FITNESS_GOALS = [
  "Build muscle",
  "Lose fat",
  "Improve endurance",
  "Increase strength",
  "Mobility & flexibility",
  "General health",
] as const;

/**
 * Result of parsing signup parameters
 */
export interface ParsedSignupParams {
  data: WebsiteOnboardingData;
  source: string;
}

/**
 * Validates that a value is one of the allowed enum values
 */
function isValidEnum<T extends string>(
  value: string | null,
  allowed: readonly T[]
): value is T {
  return value !== null && (allowed as readonly string[]).includes(value);
}

/**
 * Parses URL search parameters from the signup redirect.
 * Validates and converts to WebsiteOnboardingData format.
 *
 * @param searchParams - URLSearchParams from the redirect URL
 * @returns ParsedSignupParams if valid, null if required params are missing/invalid
 */
export function parseSignupParams(
  searchParams: URLSearchParams
): ParsedSignupParams | null {
  // Extract required parameters
  const fitnessLevel = searchParams.get("fitness_level");
  const activityLevel = searchParams.get("activity_level");
  const fitnessGoals = searchParams.get("fitness_goals");
  const equipmentAccess = searchParams.get("equipment_access");
  const unitsWeight = searchParams.get("units_weight");
  const unitsHeight = searchParams.get("units_height");

  // Validate required parameters exist
  if (
    !fitnessLevel ||
    !activityLevel ||
    !fitnessGoals ||
    !equipmentAccess ||
    !unitsWeight ||
    !unitsHeight
  ) {
    console.warn("parseSignupParams: Missing required parameters", {
      fitnessLevel,
      activityLevel,
      fitnessGoals,
      equipmentAccess,
      unitsWeight,
      unitsHeight,
    });
    return null;
  }

  // Validate enum values
  if (!isValidEnum(fitnessLevel, VALID_FITNESS_LEVELS)) {
    console.warn("parseSignupParams: Invalid fitness_level", fitnessLevel);
    return null;
  }

  if (!isValidEnum(activityLevel, VALID_ACTIVITY_LEVELS)) {
    console.warn("parseSignupParams: Invalid activity_level", activityLevel);
    return null;
  }

  // Parse equipment_access as comma-separated category strings (not enum)
  const equipmentAccessArray = equipmentAccess
    .split(",")
    .map((cat) => cat.trim())
    .filter((cat) => cat.length > 0);

  // Validate at least one category provided
  if (equipmentAccessArray.length === 0) {
    console.warn(
      "parseSignupParams: No equipment_access categories provided",
      equipmentAccess
    );
    return null;
  }

  if (!isValidEnum(unitsWeight, VALID_WEIGHT_UNITS)) {
    console.warn("parseSignupParams: Invalid units_weight", unitsWeight);
    return null;
  }

  if (!isValidEnum(unitsHeight, VALID_HEIGHT_UNITS)) {
    console.warn("parseSignupParams: Invalid units_height", unitsHeight);
    return null;
  }

  // Parse fitness goals (comma-separated string to array)
  const goalsArray = fitnessGoals
    .split(",")
    .map((g) => g.trim())
    .filter((g) => g.length > 0);

  // Validate at least one goal
  if (goalsArray.length === 0) {
    console.warn("parseSignupParams: No fitness goals provided");
    return null;
  }

  // Validate goals are from allowed values
  const validGoals = goalsArray.filter((goal) =>
    (VALID_FITNESS_GOALS as readonly string[]).includes(goal)
  );

  if (validGoals.length === 0) {
    console.warn("parseSignupParams: No valid fitness goals", goalsArray);
    return null;
  }

  // Parse optional units with defaults
  const unitsDistance = searchParams.get("units_distance");
  const unitsTemperature = searchParams.get("units_temperature");

  const preferred_units: PreferredUnits = {
    weight: unitsWeight,
    height: unitsHeight,
    distance: isValidEnum(unitsDistance, VALID_DISTANCE_UNITS)
      ? unitsDistance
      : "mi",
    temperature: isValidEnum(unitsTemperature, VALID_TEMPERATURE_UNITS)
      ? unitsTemperature
      : "f",
  };

  // Build the data object
  const data: WebsiteOnboardingData = {
    fitness_level: fitnessLevel,
    current_activity_level: activityLevel,
    fitness_goals: validGoals,
    equipment_access: equipmentAccessArray, // Now string[] instead of enum
    preferred_units,
  };

  // Parse optional gender
  const gender = searchParams.get("gender");
  if (gender && isValidEnum(gender, VALID_GENDERS)) {
    data.gender = gender;
  }

  // Parse optional age
  const ageParam = searchParams.get("age");
  if (ageParam) {
    const age = parseInt(ageParam, 10);
    if (!isNaN(age) && age >= 13 && age <= 120) {
      data.age = age;
    } else if (!isNaN(age)) {
      console.warn(
        `parseSignupParams: Ignoring invalid age "${ageParam}" (parsed as ${age}); expected age between 13 and 120.`
      );
    } else {
      console.warn(
        `parseSignupParams: Ignoring non-numeric age value "${ageParam}" in signup URL parameters.`
      );
    }
  }

  // Extract source for analytics tracking
  const source = searchParams.get("source") || "website_builder";

  return { data, source };
}

/**
 * Checks if the URL has signup parameters from the website
 */
export function hasSignupParams(searchParams: URLSearchParams): boolean {
  // Check for the presence of key required parameters
  return (
    searchParams.has("fitness_level") &&
    searchParams.has("fitness_goals") &&
    searchParams.has("equipment_access")
  );
}
