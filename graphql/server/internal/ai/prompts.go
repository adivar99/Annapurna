package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// System prompts and schemas, kept verbatim from routes/ai/index.js.

const parserSystemPrompt = "You are an expert chef assistant. Parse the given raw recipe text into a clean structured JSON format."

const analyzeSystemPrompt = "You are an expert nutritionist and chef. Provide a 2-3 sentence culinary and nutritional analysis of this recipe."

// recipeParserSchema is the strict json_schema block sent with parse requests.
const recipeParserSchema = `{
              "name": "recipe_parser",
              "strict": true,
              "schema": {
                "type": "object",
                "properties": {
                  "title": {"type": "string"},
                  "description": {"type": "string"},
                  "ingredients": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {"type": "string"},
                        "quantity": {"type": "number"},
                        "unit": {"type": "string"},
                        "notes": {"type": "string"}
                      },
                      "required": ["name", "quantity", "unit", "notes"],
                      "additionalProperties": false
                    }
                  },
                  "instructions": {
                    "type": "array",
                    "items": {"type": "string"}
                  },
                  "prep_time": {"type": "number"},
                  "cook_time": {"type": "number"},
                  "servings": {"type": "number"},
                  "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
                  "cuisine": {"type": "string"},
                  "tags": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["title", "description", "ingredients", "instructions", "prep_time", "cook_time", "servings", "difficulty", "cuisine", "tags"],
                "additionalProperties": false
              }
            }`

// AskSystemPrompt builds the "Anu" persona prompt for ask-recipe-question.
// Field values interpolate exactly like the JS template literal, including
// JSON.stringify for ingredients/instructions.
func AskSystemPrompt(title, description string, ingredients, instructions any, prepTime, cookTime, servings any) string {
	return fmt.Sprintf(
		`You are Anu, a friendly, concise, and expert cooking assistant. You are answering a question about the following recipe:`+"\n"+
			"\n"+
			`Title: %s`+"\n"+
			`Description: %s`+"\n"+
			`Ingredients: %s`+"\n"+
			`Instructions: %s`+"\n"+
			`Prep Time: %vm, Cook Time: %vm, Servings: %v.`+"\n"+
			"\n"+
			`Provide helpful culinary advice, substitutions, or step clarifications clearly and warmly.`,
		title, description,
		jsStringify(ingredients), jsStringify(instructions),
		jsInterp(prepTime), jsInterp(cookTime), jsInterp(servings),
	)
}

// jsStringify mirrors template-literal interpolation of a value that was run
// through JSON.stringify in JS: nil (undefined) renders as "undefined", other
// values as compact JSON without HTML escaping.
func jsStringify(v any) string {
	if v == nil {
		return "undefined"
	}
	return compactJSON(v)
}

func jsInterp(v any) string { return jsStringify(v) }

func compactJSON(v any) string {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return fmt.Sprintf("%v", v)
	}
	return string(bytes.TrimRight(buf.Bytes(), "\n"))
}
