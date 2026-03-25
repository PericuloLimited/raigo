export interface RaigoCondition {
    trigger?: string;
    data_classification?: string[];
    keywords?: string[];
    match?: 'any' | 'all';
    environment?: string[];
    destination?: string;
    language?: string[];
    anomaly_types?: string[];
    tool_not_in?: string[];
    action_types?: string[];
    pattern?: string;
}
export interface ComplianceMapping {
    framework: string;
    control: string;
    description?: string;
}
export interface RaigoPolicy {
    id: string;
    domain: string;
    title: string;
    condition: string | RaigoCondition;
    action: 'DENY' | 'ENFORCE' | 'WARN';
    severity: 'critical' | 'high' | 'medium' | 'low';
    directive: string;
    enforcement_message: string;
    compliance_mapping?: ComplianceMapping[];
    audit_required?: boolean;
    human_review_required?: boolean;
    tags?: string[];
}
export interface RaigoMetadata {
    organisation: string;
    policy_suite: string;
    version: string;
    effective_date?: string;
    owner?: string;
    contact?: string;
}
export interface RaigoFile {
    raigo_version: string;
    metadata: RaigoMetadata;
    policies: RaigoPolicy[];
}
export interface EvaluationRequest {
    prompt?: string;
    content?: string;
    context?: {
        action?: string;
        command?: string;
        type?: string;
        tool?: string;
        tool_invocation?: string;
        data_classification?: string[];
        environment?: string;
        destination?: string;
        language?: string;
        anomaly_types?: string[];
        agent?: string;
        session?: string;
        url?: string;
        amount?: number;
        currency?: string;
    };
    metadata?: Record<string, unknown>;
}
export interface ViolationResponse {
    rule_id: string;
    rule_title: string;
    error_code: string;
    http_status: number;
    action: 'DENY' | 'WARN';
    severity: string;
    user_message: string;
    developer_message: string;
    debug_hint: string;
    compliance_mapping?: ComplianceMapping[];
    audit_log: {
        timestamp: string;
        rule_id: string;
        action: string;
        severity: string;
        organisation: string;
        policy_suite: string;
        policy_version: string;
    };
}
export interface EvaluationResult {
    allow: boolean;
    action: 'ALLOW' | 'DENY' | 'WARN';
    evaluated_rules: number;
    triggered_rules: string[];
    violation?: ViolationResponse;
    warnings?: ViolationResponse[];
    evaluation_time_ms: number;
    policy_version: string;
    organisation: string;
}
export declare class RaigoEvaluator {
    private policy;
    private policyPath;
    constructor(policyPath: string);
    private loadPolicy;
    reload(): void;
    getMetadata(): RaigoMetadata;
    getPolicies(): RaigoPolicy[];
    evaluate(request: EvaluationRequest): EvaluationResult;
    private ruleMatches;
    /**
     * Evaluate a contains-type trigger (prompt_contains / output_contains).
     * Supports:
     *   - keywords: list of strings to match (any or all)
     *   - data_classification: PII, PHI, CLASSIFIED, CUI, PII_REQUEST
     *   - pattern: regex string
     */
    private evaluateContainsTrigger;
    /**
     * Match content against a list of keywords.
     * mode='any': at least one keyword must appear (case-insensitive)
     * mode='all': all keywords must appear
     */
    private matchesKeywords;
    private containsPII;
    private containsPIIRequest;
    private containsPHI;
    private containsClassified;
    private containsPromptInjection;
    private containsDestructiveCommand;
    private containsFinancialAction;
    private containsExternalContentExecution;
    private buildViolationResponse;
}
