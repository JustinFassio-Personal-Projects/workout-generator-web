/**
 * Default liability waiver text for AI Workout Generator.
 *
 * This waiver complies with California law requirements including:
 * - AB 489 (Medical Impersonation Prevention)
 * - AB 3030 (Generative AI Transparency)
 * - Civil Code § 1812.85 (Health Studio Services)
 * - City of Santa Barbara v. Superior Court (Gross Negligence)
 * - Knight v. Jewett (Primary Assumption of Risk)
 *
 * Version: 1.0.0
 * Effective Date: 2026-01-01
 */

export const DEFAULT_WAIVER_TEXT = `WAIVER OF LIABILITY, ASSUMPTION OF RISK, AND ARBITRATION AGREEMENT

PLEASE READ THIS DOCUMENT CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.

1. PARTIES AND SCOPE This Agreement is between, a Sole Proprietorship doing business as AiWorkoutGenerator.com ("Provider"), and you ("User"). It covers your use of the website, software, artificial intelligence agents, and any workout plans or advice generated (collectively, the "Services").

2. MEDICAL DISCLAIMER AND AI WARNING (AB 489 & AB 3030 NOTICE) WARNING: THIS SERVICE UTILIZES GENERATIVE ARTIFICIAL INTELLIGENCE.

NOT MEDICAL ADVICE: The Services are for informational and recreational purposes only. The Provider and the AI system are NOT licensed medical professionals, physicians, physical therapists, or dietitians. The generation of a workout based on your input of injuries or medical concerns does NOT constitute a medical diagnosis, treatment plan, or clearance to exercise.

RISK OF HALLUCINATION: You acknowledge that the AI system uses probabilistic modeling and may generate output that is factually incorrect, biomechanically unsafe, or contraindicated for your specific medical condition ("Hallucinations"). The AI lacks real-time knowledge of your physiological state.

CONSULT A PHYSICIAN: You agree to consult with a licensed physician before beginning any exercise program. You assume full responsibility for evaluating the safety of any instruction provided by the AI.

3. ASSUMPTION OF RISK I acknowledge that participation in the workouts provided involves INHERENT RISKS that cannot be eliminated regardless of the care taken by the Provider.

Physical Risks: I specifically assume the risk of physical injury, including but not limited to: muscle tears, rhabdomyolysis, herniated discs, joint strains, heart attacks, strokes, heat exhaustion, and death.

Technology Risks: I specifically assume the risk that the AI may fail to account for my medical history, may hallucinate dangerous exercises, or may provide instructions that are unsuitable for my fitness level. I VOLUNTARILY ASSUME ALL SUCH RISKS, KNOWN AND UNKNOWN, EVEN IF ARISING FROM THE NEGLIGENCE OF THE PROVIDER.

4. RELEASE OF LIABILITY To the fullest extent permitted by California law, I hereby RELEASE, WAIVE, DISCHARGE, AND COVENANT NOT TO SUE the Provider from any and all liability, claims, demands, or causes of action arising out of or related to any loss, damage, or injury, including death, that may be sustained by me while using the Services.

Ordinary Negligence: This release applies to injuries caused by the ORDINARY NEGLIGENCE of the Provider, including negligent programming, negligent data selection, and failure to warn.

Limitations: This release does NOT apply to claims for gross negligence, recklessness, intentional misconduct, or any other liability that cannot be waived under California law (such as the City of Santa Barbara v. Superior Court standard).

5. MANDATORY BINDING ARBITRATION AND CLASS ACTION WAIVER

Arbitration: Any dispute arising out of or relating to this Agreement shall be resolved by binding arbitration administered by JAMS or AAA in, California, in accordance with their consumer arbitration rules. YOU WAIVE YOUR RIGHT TO A JURY TRIAL.

Class Action Waiver: You agree to bring claims only in your individual capacity and not as a plaintiff or class member in any purported class or representative proceeding.

Public Injunctive Relief: Notwithstanding the above, claims for public injunctive relief under California consumer protection statutes may be brought in a court of competent jurisdiction.

6. STATUTORY CANCELLATION RIGHTS (Civil Code § 1812.85) You, the buyer, may choose to cancel this agreement at any time prior to midnight of the fifth business day of the health studio after the date of this agreement, excluding Sundays and holidays. To cancel this agreement, mail or deliver a signed and dated notice that states that you, the buyer, are canceling this agreement, or words of similar effect. The notice shall be sent to:. Death or Disability: If you become disabled or die, your estate shall be relieved of any obligation for payment for services not received.

7. INDEMNIFICATION I agree to indemnify and hold harmless the Provider from any claims, costs, or liabilities (including attorney's fees) arising from my use of the Services or my violation of this Agreement.

8. SEVERABILITY If any provision of this Agreement is held to be invalid or unenforceable (such as the scope of the release), the remaining provisions shall remain in full force and effect.`;

/**
 * Checkbox labels mapped to sections of the waiver.
 * Used to create the checkbox interface in the waiver component.
 */
export const WAIVER_CHECKBOX_SECTIONS = {
  medical_disclaimer: {
    label:
      "I understand that this service uses AI and is NOT medical advice. I will consult a physician before beginning any exercise program.",
    section: "Section 2: Medical Disclaimer & AI Warning",
  },
  assumption_of_risk: {
    label:
      "I understand and assume all inherent risks of physical exercise, including the risk of injury or death.",
    section: "Section 3: Assumption of Risk",
  },
  release_of_liability: {
    label:
      "I release the Provider from liability for injuries caused by ordinary negligence.",
    section: "Section 4: Release of Liability",
  },
  arbitration: {
    label:
      "I agree to resolve disputes through binding arbitration and waive my right to a jury trial.",
    section: "Section 5: Mandatory Binding Arbitration",
  },
  ai_disclaimer: {
    label:
      "I understand that AI may generate incorrect or unsafe advice and I assume the risk of identifying and rejecting such advice.",
    section: "Section 2: AI System Disclaimers",
  },
  full_terms: {
    label:
      "I have read and agree to the full terms of this Liability Waiver and Terms of Service.",
    section: "Full Agreement",
  },
} as const;
