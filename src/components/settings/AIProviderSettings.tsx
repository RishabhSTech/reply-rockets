/**
 * AI Provider Settings Component
 * 
 * Allows users to configure which AI provider to use for email generation
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Brain, Key, DollarSign, Zap } from "lucide-react";

type AIProvider = 'lovable' | 'claude' | 'openai';

interface ProviderInfo {
    name: string;
    description: string;
    costPerEmail: string;
    speed: string;
    quality: string;
    requiresApiKey: boolean;
}

const providerInfo: Record<AIProvider, ProviderInfo> = {
    lovable: {
        name: "Lovable AI (Gemini)",
        description: "Fast and cost-effective, powered by Google Gemini",
        costPerEmail: "$0.0001",
        speed: "Fast",
        quality: "Good",
        requiresApiKey: false,
    },
    claude: {
        name: "Claude 3.5 Sonnet",
        description: "Highest quality, best for nuanced personalization",
        costPerEmail: "$0.003",
        speed: "Medium",
        quality: "Excellent",
        requiresApiKey: true,
    },
    openai: {
        name: "GPT-4o Mini",
        description: "Balanced performance and cost",
        costPerEmail: "$0.0015",
        speed: "Fast",
        quality: "Very Good",
        requiresApiKey: true,
    },
};

export function AIProviderSettings() {
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('lovable');
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({
        claude: '',
        openai: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Load saved settings from localStorage
        const savedProvider = localStorage.getItem('ai_provider') as AIProvider;
        if (savedProvider) {
            setSelectedProvider(savedProvider);
        }

        const savedClaudeKey = localStorage.getItem('claude_api_key');
        const savedOpenAIKey = localStorage.getItem('openai_api_key');

        setApiKeys({
            claude: savedClaudeKey || '',
            openai: savedOpenAIKey || '',
        });
    }, []);

    const handleSave = () => {
        setIsSaving(true);

        try {
            // Save provider selection
            localStorage.setItem('ai_provider', selectedProvider);

            // Save API keys (encrypted in production!)
            if (apiKeys.claude) {
                localStorage.setItem('claude_api_key', apiKeys.claude);
            }
            if (apiKeys.openai) {
                localStorage.setItem('openai_api_key', apiKeys.openai);
            }

            toast({
                title: "Settings saved",
                description: `Now using ${providerInfo[selectedProvider].name} for email generation`,
            });
        } catch (error) {
            toast({
                title: "Save failed",
                description: "Failed to save AI provider settings",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const currentProvider = providerInfo[selectedProvider];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>AI Provider</CardTitle>
                        <CardDescription>
                            Choose which AI model to use for email generation
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Provider Selection */}
                <div className="space-y-2">
                    <Label htmlFor="provider">AI Model</Label>
                    <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as AIProvider)}>
                        <SelectTrigger className="bg-secondary border-0">
                            <SelectValue placeholder="Select AI provider" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(providerInfo).map(([key, info]) => (
                                <SelectItem key={key} value={key}>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{info.name}</span>
                                        <span className="text-xs text-muted-foreground">{info.description}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Provider Details */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            <span>Cost/Email</span>
                        </div>
                        <p className="text-lg font-semibold">{currentProvider.costPerEmail}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Zap className="w-4 h-4" />
                            <span>Speed</span>
                        </div>
                        <p className="text-lg font-semibold">{currentProvider.speed}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Brain className="w-4 h-4" />
                            <span>Quality</span>
                        </div>
                        <p className="text-lg font-semibold">{currentProvider.quality}</p>
                    </div>
                </div>

                {/* API Key Input (if required) */}
                {currentProvider.requiresApiKey && (
                    <div className="space-y-2">
                        <Label htmlFor="api-key" className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            API Key
                        </Label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder={`Enter your ${currentProvider.name} API key`}
                            value={apiKeys[selectedProvider] || ''}
                            onChange={(e) => setApiKeys({ ...apiKeys, [selectedProvider]: e.target.value })}
                            className="bg-secondary border-0 font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Your API key is stored locally and never sent to our servers
                        </p>
                    </div>
                )}

                {/* Info Box */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        💡 <strong>Tip:</strong> {selectedProvider === 'lovable'
                            ? 'Lovable AI is already configured and ready to use!'
                            : selectedProvider === 'claude'
                                ? 'Claude excels at nuanced, highly personalized emails with complex context.'
                                : 'GPT-4o Mini offers great balance between quality and cost for most use cases.'}
                    </p>
                </div>

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || (currentProvider.requiresApiKey && !apiKeys[selectedProvider])}
                    className="w-full"
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </CardContent>
        </Card>
    );
}
