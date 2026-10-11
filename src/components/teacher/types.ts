/** 后端返回的学生数据结构（V2：id 为字符串短 id） */
export interface ApiStudent {
  id: string;
  username: string;
  name?: string;
  avatar_path: string;
  descriptors: Record<string, unknown>;
}

/** 后端返回的班级数据结构 */
export interface ApiClass {
  class_name: string;
  students: ApiStudent[];
}
