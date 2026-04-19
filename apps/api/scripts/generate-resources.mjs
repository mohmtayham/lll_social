import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
const srcPath = path.join(projectRoot, 'src');

const scalarTypes = new Set([
  'String',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Date',
  'Json',
  'Bytes',
]);

const skipModels = new Set(['User']);

function toCamel(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function toKebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function parseSchema(schemaContent) {
  const enumNames = [...schemaContent.matchAll(/enum\s+(\w+)\s+\{/g)].map((m) => m[1]);
  const models = [];

  const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
  let modelMatch;

  while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const modelName = modelMatch[1];
    const body = modelMatch[2];
    const lines = body.split('\n');

    const fields = [];
    const modelAttributes = [];

    for (const rawLine of lines) {
      const line = rawLine.replace(/\/\/.*$/, '').trim();
      if (!line) continue;

      if (line.startsWith('@@')) {
        modelAttributes.push(line);
        continue;
      }

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const fieldName = parts[0];
      const rawType = parts[1];
      const attrs = line.slice(line.indexOf(rawType) + rawType.length).trim();

      const optional = rawType.endsWith('?');
      const isArray = rawType.endsWith('[]');
      const baseType = rawType.replace(/[?\[\]]/g, '');
      const relation = !scalarTypes.has(baseType) && !enumNames.includes(baseType);

      fields.push({
        name: fieldName,
        rawType,
        baseType,
        optional,
        isArray,
        attrs,
        relation,
      });
    }

    const fieldLevelIds = fields.filter((f) => f.attrs.includes('@id')).map((f) => f.name);
    let idFields = [...fieldLevelIds];

    const modelIdLine = modelAttributes.find((attr) => attr.startsWith('@@id('));
    if (modelIdLine) {
      const idMatch = modelIdLine.match(/@@id\(\[([^\]]+)\]/);
      if (idMatch) {
        idFields = idMatch[1]
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
      }
    }

    models.push({
      name: modelName,
      fields,
      idFields,
      modelAttributes,
    });
  }

  return { enumNames, models };
}

function tsTypeForField(field, enumNames) {
  if (enumNames.includes(field.baseType)) return field.baseType;

  switch (field.baseType) {
    case 'String':
      return 'string';
    case 'BigInt':
      return 'string';
    case 'Int':
    case 'Float':
    case 'Decimal':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
    case 'Date':
      return 'string';
    case 'Json':
      return 'Record<string, any>';
    default:
      return 'string';
  }
}

function validatorForField(field, enumNames) {
  if (enumNames.includes(field.baseType)) {
    return { validator: `IsEnum(${field.baseType})`, importName: 'IsEnum' };
  }

  switch (field.baseType) {
    case 'String':
    case 'BigInt':
      return { validator: 'IsString()', importName: 'IsString' };
    case 'Int':
    case 'Float':
    case 'Decimal':
      return { validator: 'IsNumber()', importName: 'IsNumber' };
    case 'Boolean':
      return { validator: 'IsBoolean()', importName: 'IsBoolean' };
    case 'DateTime':
    case 'Date':
      return { validator: 'IsDateString()', importName: 'IsDateString' };
    case 'Json':
      return { validator: 'IsObject()', importName: 'IsObject' };
    default:
      return { validator: 'IsString()', importName: 'IsString' };
  }
}

function parseExpressionForId(field, varName) {
  switch (field?.baseType) {
    case 'BigInt':
      return `BigInt(${varName})`;
    case 'Int':
    case 'Float':
    case 'Decimal':
      return `Number(${varName})`;
    case 'Boolean':
      return `${varName} === 'true'`;
    default:
      return varName;
  }
}

function shouldIncludeInCreateDto(field, idSet) {
  if (idSet.has(field.name)) return false;
  if (field.relation || field.isArray) return false;
  if (field.name === 'createdAt' || field.name === 'updatedAt' || field.name === 'deletedAt') return false;
  if (field.attrs.includes('@updatedAt')) return false;
  if (field.attrs.includes('@default(autoincrement())')) return false;
  return true;
}

function createDtoContent(model, enumNames) {
  const idSet = new Set(model.idFields);
  const dtoFields = model.fields.filter((field) => shouldIncludeInCreateDto(field, idSet));

  if (dtoFields.length === 0) {
    return `export class Create${model.name}Dto {}\n`;
  }

  const validatorImports = new Set();
  const enumImports = new Set();

  const fieldBlocks = dtoFields.map((field) => {
    const lines = [];
    const hasDefault = field.attrs.includes('@default(') || field.attrs.includes('@updatedAt');
    const optional = field.optional || hasDefault;

    if (optional) {
      lines.push('  @IsOptional()');
      validatorImports.add('IsOptional');
    }

    const { validator, importName } = validatorForField(field, enumNames);
    validatorImports.add(importName);

    if (enumNames.includes(field.baseType)) {
      enumImports.add(field.baseType);
    }

    lines.push(`  @${validator}`);

    const tsType = tsTypeForField(field, enumNames);
    const optionalToken = optional ? '?' : '';
    lines.push(`  ${field.name}${optionalToken}: ${tsType};`);

    return lines.join('\n');
  });

  const validatorImportLine = `import { ${[...validatorImports].sort().join(', ')} } from 'class-validator';`;
  const enumImportLine = enumImports.size
    ? `import { ${[...enumImports].sort().join(', ')} } from '@prisma/client';\n`
    : '';

  return `${validatorImportLine}\n${enumImportLine}export class Create${model.name}Dto {\n${fieldBlocks.join('\n\n')}\n}\n`;
}

function updateDtoContent(model) {
  const fileBase = toKebab(model.name);
  return `import { PartialType } from '@nestjs/mapped-types';\nimport { Create${model.name}Dto } from './create-${fileBase}.dto';\n\nexport class Update${model.name}Dto extends PartialType(Create${model.name}Dto) {}\n`;
}

function moduleContent(model) {
  const fileBase = toKebab(model.name);
  return `import { Module } from '@nestjs/common';\nimport { ${model.name}Service } from './${fileBase}.service';\nimport { ${model.name}Controller } from './${fileBase}.controller';\nimport { PrismaService } from 'src/prisma/prisma.service';\n\n@Module({\n  controllers: [${model.name}Controller],\n  providers: [${model.name}Service, PrismaService],\n})\nexport class ${model.name}Module {}\n`;
}

function serviceContent(model) {
  const fileBase = toKebab(model.name);
  const delegate = toCamel(model.name);
  const idFields = model.idFields;
  const fieldByName = new Map(model.fields.map((field) => [field.name, field]));

  let idMethods = '';

  if (idFields.length === 1) {
    const idField = idFields[0];
    const parsed = parseExpressionForId(fieldByName.get(idField), 'id');

    idMethods = `\n  findOne(id: string) {\n    return this.prisma.${delegate}.findUnique({\n      where: { ${idField}: ${parsed} } as any,\n    });\n  }\n\n  update(id: string, update${model.name}Dto: Update${model.name}Dto) {\n    return this.prisma.${delegate}.update({\n      where: { ${idField}: ${parsed} } as any,\n      data: update${model.name}Dto as any,\n    });\n  }\n\n  remove(id: string) {\n    return this.prisma.${delegate}.delete({\n      where: { ${idField}: ${parsed} } as any,\n    });\n  }\n`;
  } else if (idFields.length > 1) {
    const params = idFields.map((field) => `${field}: string`).join(', ');
    const compositeKey = idFields.join('_');
    const compositeBody = idFields
      .map((field) => `        ${field}: ${parseExpressionForId(fieldByName.get(field), field)},`)
      .join('\n');

    idMethods = `\n  findOne(${params}) {\n    return this.prisma.${delegate}.findUnique({\n      where: {\n        ${compositeKey}: {\n${compositeBody}\n        },\n      } as any,\n    });\n  }\n\n  update(${params}, update${model.name}Dto: Update${model.name}Dto) {\n    return this.prisma.${delegate}.update({\n      where: {\n        ${compositeKey}: {\n${compositeBody}\n        },\n      } as any,\n      data: update${model.name}Dto as any,\n    });\n  }\n\n  remove(${params}) {\n    return this.prisma.${delegate}.delete({\n      where: {\n        ${compositeKey}: {\n${compositeBody}\n        },\n      } as any,\n    });\n  }\n`;
  }

  return `import { Injectable } from '@nestjs/common';\nimport { PrismaService } from 'src/prisma/prisma.service';\nimport { Create${model.name}Dto } from './dto/create-${fileBase}.dto';\nimport { Update${model.name}Dto } from './dto/update-${fileBase}.dto';\n\n@Injectable()\nexport class ${model.name}Service {\n  constructor(private readonly prisma: PrismaService) {}\n\n  create(create${model.name}Dto: Create${model.name}Dto) {\n    return this.prisma.${delegate}.create({\n      data: create${model.name}Dto as any,\n    });\n  }\n\n  findAll() {\n    return this.prisma.${delegate}.findMany();\n  }${idMethods}}\n`;
}

function controllerContent(model) {
  const fileBase = toKebab(model.name);
  const serviceProp = `${toCamel(model.name)}Service`;
  const idFields = model.idFields;
  const routePath = fileBase;

  let idMethods = '';

  if (idFields.length === 1) {
    idMethods = `\n  @Get(':id')\n  findOne(@Param('id') id: string) {\n    return this.${serviceProp}.findOne(id);\n  }\n\n  @Patch(':id')\n  update(@Param('id') id: string, @Body() update${model.name}Dto: Update${model.name}Dto) {\n    return this.${serviceProp}.update(id, update${model.name}Dto);\n  }\n\n  @Delete(':id')\n  remove(@Param('id') id: string) {\n    return this.${serviceProp}.remove(id);\n  }\n`;
  } else if (idFields.length > 1) {
    const routeSuffix = idFields.map((field) => `:${field}`).join('/');
    const params = idFields.map((field) => `@Param('${field}') ${field}: string`).join(', ');
    const callArgs = idFields.join(', ');

    idMethods = `\n  @Get('${routeSuffix}')\n  findOne(${params}) {\n    return this.${serviceProp}.findOne(${callArgs});\n  }\n\n  @Patch('${routeSuffix}')\n  update(${params}, @Body() update${model.name}Dto: Update${model.name}Dto) {\n    return this.${serviceProp}.update(${callArgs}, update${model.name}Dto);\n  }\n\n  @Delete('${routeSuffix}')\n  remove(${params}) {\n    return this.${serviceProp}.remove(${callArgs});\n  }\n`;
  }

  return `import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';\nimport { ${model.name}Service } from './${fileBase}.service';\nimport { Create${model.name}Dto } from './dto/create-${fileBase}.dto';\nimport { Update${model.name}Dto } from './dto/update-${fileBase}.dto';\n\n@Controller('${routePath}')\nexport class ${model.name}Controller {\n  constructor(private readonly ${serviceProp}: ${model.name}Service) {}\n\n  @Post()\n  create(@Body() create${model.name}Dto: Create${model.name}Dto) {\n    return this.${serviceProp}.create(create${model.name}Dto);\n  }\n\n  @Get()\n  findAll() {\n    return this.${serviceProp}.findAll();\n  }${idMethods}}\n`;
}

async function writeModelResource(model, enumNames) {
  const folderName = toKebab(model.name);
  const folderPath = path.join(srcPath, folderName);
  const dtoPath = path.join(folderPath, 'dto');
  const fileBase = folderName;

  await fs.mkdir(dtoPath, { recursive: true });

  await fs.writeFile(path.join(folderPath, `${fileBase}.module.ts`), moduleContent(model), 'utf8');
  await fs.writeFile(path.join(folderPath, `${fileBase}.service.ts`), serviceContent(model), 'utf8');
  await fs.writeFile(path.join(folderPath, `${fileBase}.controller.ts`), controllerContent(model), 'utf8');
  await fs.writeFile(
    path.join(dtoPath, `create-${fileBase}.dto.ts`),
    createDtoContent(model, enumNames),
    'utf8',
  );
  await fs.writeFile(
    path.join(dtoPath, `update-${fileBase}.dto.ts`),
    updateDtoContent(model),
    'utf8',
  );
}

function buildAppModuleContent(generatedModels) {
  const generatedImports = generatedModels
    .map((model) => {
      const folder = toKebab(model.name);
      return `import { ${model.name}Module } from './${folder}/${folder}.module';`;
    })
    .join('\n');

  const generatedModuleNames = generatedModels.map((model) => `${model.name}Module`).join(',\n    ');

  return `import { Module } from '@nestjs/common';\nimport { AppController } from './app.controller';\nimport { AppService } from './app.service';\nimport { PrismaService } from './prisma/prisma.service';\nimport { AuthModule } from './auth/auth.module';\nimport { UserModule } from './user/user.module';\nimport { ConfigModule } from '@nestjs/config';\nimport { APP_GUARD } from '@nestjs/core';\nimport { JwtAuthGuard } from './auth/guards/jwt-auth/jwt-auth.guard';\n${generatedImports ? `${generatedImports}\n` : ''}\n@Module({\n  imports: [\n    AuthModule,\n    UserModule,\n    ${generatedModuleNames ? `${generatedModuleNames},\n    ` : ''}ConfigModule.forRoot({ isGlobal: true }),\n  ],\n  controllers: [AppController],\n  providers: [\n    AppService,\n    PrismaService,\n    {\n      provide: APP_GUARD,\n      useClass: JwtAuthGuard,\n    },\n  ],\n})\nexport class AppModule {}\n`;
}

async function main() {
  const schemaContent = await fs.readFile(schemaPath, 'utf8');
  const { enumNames, models } = parseSchema(schemaContent);

  const modelsToGenerate = models
    .filter((model) => !skipModels.has(model.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const model of modelsToGenerate) {
    await writeModelResource(model, enumNames);
  }

  const appModulePath = path.join(srcPath, 'app.module.ts');
  await fs.writeFile(appModulePath, buildAppModuleContent(modelsToGenerate), 'utf8');

  console.log(`Generated resources for ${modelsToGenerate.length} models.`);
}

main().catch((error) => {
  console.error('Resource generation failed:', error);
  process.exit(1);
});
