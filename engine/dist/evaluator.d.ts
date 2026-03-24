export interface RaigoCondition {
    trigger?: string;
    data_classification?: string[];
    environment?: string[];
    destination?: string;
    pattern?: string;
    language?: string[];
    anomaly_types?: string[];
    tool_not_in?: string[];
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
        data_classification?: string[];
        environment?: string;
        destination?: string;
        tool?: string;
        language?: string;
        anomaly_types?: string[];
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
    private containsPII;
    private containsPHI;
    private containsClassified;
    private containsPromptInjection;
    private buildViolationResponse;
}
