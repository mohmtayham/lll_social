import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PostCategoryMapService } from './post-category-map.service';
import { CreatePostCategoryMapDto } from './dto/create-post-category-map.dto';
import { UpdatePostCategoryMapDto } from './dto/update-post-category-map.dto';

@Controller('post-category-map')
export class PostCategoryMapController {
  constructor(private readonly postCategoryMapService: PostCategoryMapService) {}

  @Post()
  create(@Body() createPostCategoryMapDto: CreatePostCategoryMapDto) {
    return this.postCategoryMapService.create(createPostCategoryMapDto);
  }

  @Get()
  findAll() {
    return this.postCategoryMapService.findAll();
  }
  @Get(':postId/:categoryId')
  findOne(@Param('postId') postId: string, @Param('categoryId') categoryId: string) {
    return this.postCategoryMapService.findOne(postId, categoryId);
  }

  @Patch(':postId/:categoryId')
  update(@Param('postId') postId: string, @Param('categoryId') categoryId: string, @Body() updatePostCategoryMapDto: UpdatePostCategoryMapDto) {
    return this.postCategoryMapService.update(postId, categoryId, updatePostCategoryMapDto);
  }

  @Delete(':postId/:categoryId')
  remove(@Param('postId') postId: string, @Param('categoryId') categoryId: string) {
    return this.postCategoryMapService.remove(postId, categoryId);
  }
}
