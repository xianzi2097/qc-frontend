/** 后端返回的学生数据结构 */
export interface ApiStudent {
  id: number;
  username: string;
  nickname: string;
  avatar_path: string;
  descriptors: Record<string, unknown>;
}

/** 后端返回的班级数据结构 */
export interface ApiClass {
  class_name: string;
  students: ApiStudent[];
}
