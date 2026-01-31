import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Clock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step {
    id: string;
    type: "email" | "delay";
    name: string;
    config: {
        delayDays?: number;
        subject?: string;
        prompt?: string; // Custom prompt instruction for this step
    };
}

interface SequenceBuilderProps {
    campaignId: string;
    initialSequence: Step[];
}

export function SequenceBuilder({ campaignId, initialSequence }: SequenceBuilderProps) {
    const [sequence, setSequence] = useState<Step[]>(initialSequence || []);
    const [isSaving, setIsSaving] = useState(false);

    // Add default steps if empty
    if (sequence.length === 0) {
        setSequence([
            {
                id: "1",
                type: "email",
                name: "Intro Email",
                config: {
                    prompt: "Write an introductory email focusing on value proposition."
                }
            }
        ]);
    }

    const addStep = () => {
        const newStep: Step = {
            id: crypto.randomUUID(),
            type: "email",
            name: `Follow-up ${sequence.filter(s => s.type === "email").length}`,
            config: {
                delayDays: 2,
                prompt: "Write a polite follow-up emphasizing benefits."
            }
        };
        setSequence([...sequence, newStep]);
    };

    const updateStep = (id: string, updates: Partial<Step> | Partial<Step["config"]>) => {
        setSequence(sequence.map(step => {
            if (step.id !== id) return step;
            // Handle config updates vs root updates
            if ('delayDays' in updates || 'subject' in updates || 'prompt' in updates) {
                return { ...step, config: { ...step.config, ...updates } };
            }
            return { ...step, ...updates as any };
        }));
    };

    const removeStep = (id: string) => {
        setSequence(sequence.filter(s => s.id !== id));
    };

    const saveSequence = async () => {
        setIsSaving(true);
        try {
            // In a real app, you might want to use a JSONB column update or a separate table
            // Here we assume campaign has a 'sequence' jsonb column
            const { error } = await supabase
                .from("campaigns")
                .update({ sequence: sequence } as any)
                .eq("id", campaignId);

            if (error) throw error;
            toast.success("Sequence saved successfully");
        } catch (error) {
            console.error("Error saving sequence:", error);
            toast.error("Failed to save sequence");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-medium">Outreach Sequence</h3>
                    <p className="text-sm text-muted-foreground">Define the steps for this campaign</p>
                </div>
                <Button onClick={saveSequence} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Sequence"}
                </Button>
            </div>

            <div className="space-y-4">
                {sequence.map((step, index) => (
                    <div key={step.id} className="relative pl-8 pb-8 last:pb-0">
                        {/* Connector Line */}
                        {index !== sequence.length - 1 && (
                            <div className="absolute left-[15px] top-[40px] bottom-0 w-0.5 bg-border" />
                        )}

                        {/* Step Number/Icon */}
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 z-10">
                            {step.type === "email" ? <Mail className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>

                        <Card>
                            <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <Input
                                        value={step.name}
                                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                        className="h-8 font-medium w-64 bg-transparent border-transparent hover:border-input focus:border-input transition-colors px-2 -ml-2"
                                    />
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {index > 0 && (
                                        <div className="flex items-center gap-2 mr-4 bg-secondary/50 px-2 py-1 rounded text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            Wait
                                            <Input
                                                type="number"
                                                min="1"
                                                value={step.config.delayDays || 2}
                                                onChange={(e) => updateStep(step.id, { delayDays: parseInt(e.target.value) })}
                                                className="w-12 h-6 text-center text-xs p-0 mx-1"
                                            />
                                            days
                                        </div>
                                    )}
                                    {index > 0 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeStep(step.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <Label className="text-xs font-semibold text-muted-foreground">AI Prompt Configuration</Label>
                                            <p className="text-xs text-muted-foreground mt-1">This prompt guides the AI to create personalized icebreakers using each lead's persona data</p>
                                        </div>
                                    </div>
                                    <Textarea
                                        value={step.config.prompt}
                                        onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                                        placeholder="e.g. Write a friendly follow-up referencing their pain point about scaling. Mention how you understand their challenge..."
                                        className="min-h-[100px] text-sm"
                                    />
                                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3 text-xs text-blue-900 dark:text-blue-100">
                                        <strong>💡 Tip:</strong> Reference pain points here. The AI will combine this prompt with each lead's persona (pain points, priorities, icebreaker hooks) to create truly personalized emails.
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}

                <div className="pt-4 pl-8">
                    <Button variant="outline" className="w-full border-dashed" onClick={addStep}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Follow-up Step
                    </Button>
                </div>
            </div>
        </div>
    );
}
