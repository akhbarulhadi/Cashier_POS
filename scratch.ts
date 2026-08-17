import { z } from "zod";

const chatRequestSchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
});

const payload3 = {
  sessionId: ""
};

try {
  chatRequestSchema.parse(payload3);
  console.log("Success with empty string");
} catch (e) {
  console.log("Error with empty string:");
  console.log(e);
}
