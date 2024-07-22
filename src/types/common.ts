export type Paths<T> = T extends object
	? {
			[K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${Paths<T[K]>}` : `${K}`) : never
	  }[keyof T]
	: never

export type Extended<T> = T | (string & {})
