/**
 * 查询安全验证器
 * 确保AI生成的查询是安全的，防止危险操作
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class QuerySecurityValidator {
  private allowedOperations = ['find', 'aggregate', 'count', 'distinct', 'countDocuments', 'estimatedDocumentCount'];
  private blockedOperations = [
    'drop', 'remove', 'delete', 'deleteOne', 'deleteMany',
    'update', 'updateOne', 'updateMany', 'replaceOne',
    'insert', 'insertOne', 'insertMany',
    'createIndex', 'dropIndex', 'dropIndexes',
    'renameCollection', 'createCollection', 'dropCollection'
  ];
  
  private dangerousOperators = [
    '$out', '$merge', '$unset', '$set', '$push', '$pull',
    '$addToSet', '$pop', '$rename', '$inc', '$mul', '$min', '$max'
  ];
  
  validateQuery(query: any, operation: string = 'find'): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // 检查操作类型
    if (!this.allowedOperations.includes(operation.toLowerCase())) {
      result.isValid = false;
      result.errors.push(`不允许的操作类型: ${operation}`);
    }
    
    // 检查是否包含危险操作
    const queryStr = JSON.stringify(query).toLowerCase();
    for (const op of this.blockedOperations) {
      if (queryStr.includes(op.toLowerCase())) {
        result.isValid = false;
        result.errors.push(`检测到危险操作: ${op}`);
      }
    }
    
    // 检查危险操作符
    for (const operator of this.dangerousOperators) {
      if (queryStr.includes(operator.toLowerCase())) {
        result.isValid = false;
        result.errors.push(`不允许的操作符: ${operator}`);
      }
    }
    
    // 检查查询复杂度
    if (this.isQueryTooComplex(query)) {
      result.warnings.push('查询较为复杂，可能影响性能');
    }
    
    // 检查聚合管道
    if (query.pipeline && Array.isArray(query.pipeline)) {
      const pipelineValidation = this.validateAggregationPipeline(query.pipeline);
      result.errors.push(...pipelineValidation.errors);
      result.warnings.push(...pipelineValidation.warnings);
      if (pipelineValidation.errors.length > 0) {
        result.isValid = false;
      }
    }
    
    return result;
  }
  
  private isQueryTooComplex(query: any): boolean {
    // 检查聚合管道长度
    if (query.pipeline && query.pipeline.length > 10) {
      return true;
    }
    
    // 检查嵌套深度
    if (this.getObjectDepth(query) > 5) {
      return true;
    }
    
    // 检查查询条件数量
    if (this.countQueryConditions(query) > 20) {
      return true;
    }
    
    return false;
  }
  
  private getObjectDepth(obj: any, depth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }
    
    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const currentDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }
    
    return maxDepth;
  }
  
  private countQueryConditions(obj: any): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }
    
    let count = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        count++;
        count += this.countQueryConditions(obj[key]);
      }
    }
    
    return count;
  }
  
  private validateAggregationPipeline(pipeline: any[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];
      const stageKeys = Object.keys(stage);
      
      // 检查每个阶段
      for (const stageKey of stageKeys) {
        if (this.dangerousOperators.includes(stageKey)) {
          result.isValid = false;
          result.errors.push(`聚合管道第${i + 1}阶段包含危险操作符: ${stageKey}`);
        }
        
        // 检查$lookup阶段的复杂度
        if (stageKey === '$lookup' && this.isLookupTooComplex(stage[stageKey])) {
          result.warnings.push(`聚合管道第${i + 1}阶段的$lookup操作较为复杂`);
        }
        
        // 检查$group阶段
        if (stageKey === '$group' && this.isGroupTooComplex(stage[stageKey])) {
          result.warnings.push(`聚合管道第${i + 1}阶段的$group操作较为复杂`);
        }
      }
    }
    
    return result;
  }
  
  private isLookupTooComplex(lookup: any): boolean {
    // 检查是否有复杂的pipeline
    if (lookup.pipeline && lookup.pipeline.length > 5) {
      return true;
    }
    
    return false;
  }
  
  private isGroupTooComplex(group: any): boolean {
    // 检查分组字段数量
    if (group._id && typeof group._id === 'object') {
      const groupFields = Object.keys(group._id);
      if (groupFields.length > 5) {
        return true;
      }
    }
    
    // 检查聚合操作数量
    const aggregationOps = Object.keys(group).filter(key => key !== '_id');
    if (aggregationOps.length > 10) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 清理和优化查询
   */
  sanitizeQuery(query: any): any {
    // 深拷贝查询对象
    const sanitized = JSON.parse(JSON.stringify(query));
    
    // 移除危险字段
    this.removeDangerousFields(sanitized);
    
    // 添加安全限制
    this.addSafetyLimits(sanitized);
    
    return sanitized;
  }
  
  private removeDangerousFields(obj: any): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // 移除危险操作符
        if (this.dangerousOperators.includes(key)) {
          delete obj[key];
          continue;
        }
        
        // 递归处理嵌套对象
        this.removeDangerousFields(obj[key]);
      }
    }
  }
  
  private addSafetyLimits(query: any): void {
    // 为find查询添加默认限制
    if (!query.limit && !query.pipeline) {
      query.limit = 1000; // 默认最大返回1000条记录
    }
    
    // 为聚合管道添加限制
    if (query.pipeline && Array.isArray(query.pipeline)) {
      const hasLimit = query.pipeline.some(stage => stage.$limit);
      if (!hasLimit) {
        query.pipeline.push({ $limit: 1000 });
      }
    }
  }
  
  /**
   * 估算查询性能
   */
  estimatePerformance(query: any, collectionStats?: any): string {
    let score = 0;
    
    // 基于查询复杂度评分
    const depth = this.getObjectDepth(query);
    const conditions = this.countQueryConditions(query);
    
    if (depth > 3) score += 2;
    if (conditions > 10) score += 2;
    
    // 检查是否使用了索引友好的查询
    if (this.hasIndexFriendlyQueries(query)) {
      score -= 1;
    }
    
    // 检查聚合管道
    if (query.pipeline) {
      score += query.pipeline.length * 0.5;
      
      // 检查是否有$lookup
      const hasLookup = query.pipeline.some((stage: any) => stage.$lookup);
      if (hasLookup) score += 2;
    }
    
    // 返回性能评估
    if (score <= 1) return 'excellent';
    if (score <= 3) return 'good';
    if (score <= 5) return 'fair';
    return 'poor';
  }
  
  private hasIndexFriendlyQueries(query: any): boolean {
    // 检查是否查询了常见的索引字段
    const indexFriendlyFields = ['_id', 'id', 'userId', 'createdAt', 'updatedAt'];
    const queryStr = JSON.stringify(query);
    
    return indexFriendlyFields.some(field => queryStr.includes(field));
  }
}